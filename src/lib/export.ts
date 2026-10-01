import { monthOf, round2 } from "@/lib/format";
import { netPay, sumLines } from "@/lib/salary";
import type { Category, Recurring, SalaryRecord, Transaction } from "@/lib/schemas";

export interface ExportInput {
  month: string;
  currency: string;
  categories: Category[];
  transactions: Transaction[];
  budgets: Map<string, number>;
  salary: SalaryRecord[];
  recurring: Recurring[];
}

type Row = (string | number | boolean | null)[];

export function exportFilename(month: string): string {
  return `budget-export-${month}.xlsx`;
}

export async function exportMonthToExcel(input: ExportInput): Promise<string> {
  const XLSX = await import("xlsx");
  const categoryNames = new Map(
    input.categories.map((category) => [category.id, category.name]),
  );
  const categoryName = (id: string) => categoryNames.get(id) ?? "Uncategorised";

  const inMonth = (date: string) => monthOf(date) === input.month;
  const monthTransactions = [...input.transactions]
    .filter((transaction) => inMonth(transaction.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const monthSalary = input.salary
    .filter((record) => inMonth(record.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const spentByCategory = new Map<string, number>();
  for (const transaction of monthTransactions) {
    const current = spentByCategory.get(transaction.categoryId) ?? 0;
    spentByCategory.set(
      transaction.categoryId,
      round2(
        current +
          (transaction.type === "expense" ? transaction.amount : -transaction.amount),
      ),
    );
  }

  const expenseCategories = input.categories.filter(
    (category) => category.type === "expense",
  );
  const budgetRows: Row[] = [["Category", "Limit", "Spent", "Left"]];
  let budgetTotal = 0;
  for (const category of expenseCategories) {
    const limit = input.budgets.get(category.id) ?? category.monthlyLimit;
    const spent = spentByCategory.get(category.id) ?? 0;
    if (limit === null && spent === 0) continue;
    budgetTotal += limit ?? 0;
    budgetRows.push([
      category.name,
      limit ?? "",
      spent,
      limit === null ? "" : round2(limit - spent),
    ]);
  }

  const spent = round2(
    [...spentByCategory.values()]
      .filter((value) => value > 0)
      .reduce((sum, value) => sum + value, 0),
  );
  const netTotal = round2(monthSalary.reduce((sum, record) => sum + netPay(record), 0));

  const sheets: Record<string, Row[]> = {
    Summary: [
      ["Budget export", input.month],
      [],
      ["Metric", "Value"],
      ["Transactions", monthTransactions.length],
      ["Spent", spent],
      ["Budgeted", round2(budgetTotal)],
      ["Left", round2(budgetTotal - spent)],
      ["Salary records", monthSalary.length],
      ["Net pay", netTotal],
      ["Currency", input.currency],
    ],
    Transactions: [
      ["Date", "Category", "Type", "Amount", "Note"],
      ...monthTransactions.map((transaction) => [
        transaction.date,
        categoryName(transaction.categoryId),
        transaction.type,
        transaction.amount,
        transaction.note,
      ]),
    ],
    Budgets: budgetRows,
    Salary: [
      ["Date", "Label", "Gross pay", "Additions", "Deductions", "Net pay", "Note"],
      ...monthSalary.map((record) => [
        record.date,
        record.label,
        record.grossPay,
        sumLines(record.allowances),
        sumLines(record.deductions),
        netPay(record),
        record.note,
      ]),
    ],
    Categories: [
      ["Name", "Type", "Icon", "Colour", "Default monthly limit"],
      ...input.categories.map((category) => [
        category.name,
        category.type,
        category.icon,
        category.color,
        category.monthlyLimit ?? "",
      ]),
    ],
    Recurring: [
      [
        "Name",
        "Category",
        "Type",
        "Amount",
        "Frequency",
        "Start date",
        "Next due",
        "Active",
      ],
      ...input.recurring.map((item) => [
        item.name,
        categoryName(item.categoryId),
        item.type,
        item.amount,
        item.frequency,
        item.startDate,
        item.nextDueDate,
        item.active ? "Yes" : "No",
      ]),
    ],
  };

  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }

  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFilename(input.month);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  return exportFilename(input.month);
}
