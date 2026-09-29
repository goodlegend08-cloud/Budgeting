import { budgetId } from "@/lib/budgets";
import { db } from "@/lib/db";
import { round2, localTodayISO } from "@/lib/format";
import { advanceDate, recurringNote } from "@/lib/recurring";
import type {
  CategoryFormValues,
  ImportFile,
  RecurringFormValues,
  SalaryFormValues,
  TransactionFormValues,
} from "@/lib/schemas";

/**
 * Resolve only once a write has provably committed: IndexedDB runs a later
 * read on the same store after an earlier write has finished, so reading the
 * row back both waits for the commit and confirms its outcome. Without it a
 * navigation inside the commit window can roll the write back.
 */
async function verify(check: () => Promise<boolean>, message: string): Promise<void> {
  const ok = await check();
  if (!ok) throw new Error(message);
}

export async function saveTransaction(
  values: TransactionFormValues,
  existingId?: string,
): Promise<string> {
  const payload = {
    ...values,
    amount: round2(values.amount),
    note: values.note ?? "",
  };

  // Explicit transaction: the promise resolves only after the write commits,
  // so a fast navigation right after saving cannot roll it back.
  return db.transaction("rw", db.transactions, async () => {
    if (existingId) {
      const existing = await db.transactions.get(existingId);
      if (!existing) throw new Error("Transaction not found");
      await db.transactions.put({ ...existing, ...payload });
      return existingId;
    }

    const id = crypto.randomUUID();
    await db.transactions.add({
      ...payload,
      id,
      recurringId: null,
      createdAt: new Date().toISOString(),
    });
    return id;
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    await db.transactions.delete(id);
  });
}

export async function setBudgetOverride(
  month: string,
  categoryId: string,
  limit: number | null,
): Promise<void> {
  const id = budgetId(month, categoryId);
  await db.transaction("rw", db.budgets, async () => {
    if (limit === null) {
      await db.budgets.delete(id);
      return;
    }
    await db.budgets.put({ id, month, categoryId, limit: round2(limit) });
  });
}

async function usageCount(categoryId: string): Promise<number> {
  return db.transactions.where("categoryId").equals(categoryId).count();
}

async function activeCountOfType(type: string, excludeId?: string): Promise<number> {
  const categories = await db.categories.where("type").equals(type).toArray();
  return categories.filter(
    (category) => !category.archived && category.id !== excludeId,
  ).length;
}

function lastOfTypeMessage(type: string): string {
  return `Keep at least one ${type} category`;
}

export async function saveCategory(
  values: CategoryFormValues,
  existingId?: string,
): Promise<string> {
  const payload = {
    ...values,
    monthlyLimit: values.monthlyLimit === null ? null : round2(values.monthlyLimit),
  };

  return db.transaction("rw", db.categories, async () => {
    const all = await db.categories.toArray();
    const duplicate = all.some(
      (category) =>
        category.id !== existingId &&
        !category.archived &&
        category.type === payload.type &&
        category.name.toLowerCase() === payload.name.toLowerCase(),
    );
    if (duplicate) throw new Error("A category with this name already exists");

    if (existingId) {
      const existing = await db.categories.get(existingId);
      if (!existing) throw new Error("Category not found");
      await db.categories.put({ ...existing, ...payload });
      return existingId;
    }

    const id = crypto.randomUUID();
    await db.categories.add({
      ...payload,
      id,
      archived: false,
      createdAt: new Date().toISOString(),
    });
    return id;
  });
}

export async function setCategoryArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  await db.transaction("rw", db.categories, db.transactions, async () => {
    const category = await db.categories.get(id);
    if (!category) throw new Error("Category not found");
    if (archived && (await activeCountOfType(category.type, id)) === 0) {
      throw new Error(lastOfTypeMessage(category.type));
    }
    await db.categories.update(id, { archived });
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await db.transaction("rw", db.categories, db.transactions, db.budgets, async () => {
    const category = await db.categories.get(id);
    if (!category) return;
    if ((await usageCount(id)) > 0) {
      throw new Error("This category has transactions — archive it instead");
    }
    if (!category.archived && (await activeCountOfType(category.type, id)) === 0) {
      throw new Error(lastOfTypeMessage(category.type));
    }
    await db.budgets.where("categoryId").equals(id).delete();
    await db.categories.delete(id);
  });
}

export interface SaveRecurringResult {
  id: string;
  created: number;
}

async function generateOccurrences(
  recurringId: string,
  today: string,
): Promise<number> {
  const item = await db.recurring.get(recurringId);
  if (!item || !item.active) return 0;

  let next = item.nextDueDate;
  let created = 0;
  let guard = 0;

  while (next <= today && guard < 1000) {
    const transactionId = `${item.id}@${next}`;
    const existing = await db.transactions.get(transactionId);
    if (!existing) {
      await db.transactions.add({
        id: transactionId,
        date: next,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        note: recurringNote(item),
        recurringId: item.id,
        createdAt: new Date().toISOString(),
      });
      created += 1;
    }
    next = advanceDate(next, item.frequency);
    guard += 1;
  }

  if (next !== item.nextDueDate) {
    await db.recurring.update(recurringId, { nextDueDate: next });
  }
  return created;
}

export async function materializeRecurring(): Promise<number> {
  const today = localTodayISO();
  const items = await db.recurring.toArray();
  const due = items.filter((item) => item.active && item.nextDueDate <= today);
  if (due.length === 0) return 0;

  let created = 0;
  await db.transaction("rw", db.recurring, db.transactions, async () => {
    for (const item of due) {
      created += await generateOccurrences(item.id, today);
    }
  });
  return created;
}

export async function saveRecurring(
  values: RecurringFormValues,
  existingId?: string,
): Promise<SaveRecurringResult> {
  const payload = { ...values, amount: round2(values.amount), note: values.note ?? "" };

  return db.transaction("rw", db.recurring, db.transactions, async () => {
    let id: string;
    if (existingId) {
      const existing = await db.recurring.get(existingId);
      if (!existing) throw new Error("Recurring item not found");
      const nextDueDate =
        payload.startDate > existing.nextDueDate
          ? payload.startDate
          : existing.nextDueDate;
      await db.recurring.put({ ...existing, ...payload, nextDueDate });
      id = existingId;
    } else {
      id = crypto.randomUUID();
      await db.recurring.add({
        ...payload,
        id,
        nextDueDate: payload.startDate,
        active: true,
        createdAt: new Date().toISOString(),
      });
    }

    const created = await materializeRecurring();
    return { id, created };
  });
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  await db.transaction("rw", db.recurring, async () => {
    const item = await db.recurring.get(id);
    if (!item) throw new Error("Recurring item not found");
    await db.recurring.update(id, { active });
  });
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.transaction("rw", db.recurring, db.transactions, async () => {
    await db.transactions.where("recurringId").equals(id).modify({ recurringId: null });
    await db.recurring.delete(id);
  });
}

export async function saveSalaryRecord(
  values: SalaryFormValues,
  existingId?: string,
): Promise<string> {
  return db.transaction("rw", db.salary, async () => {
    const payload = {
      ...values,
      grossPay: round2(values.grossPay),
      allowances: values.allowances.map((line) => ({
        ...line,
        amount: round2(line.amount),
      })),
      deductions: values.deductions.map((line) => ({
        ...line,
        amount: round2(line.amount),
      })),
      note: values.note ?? "",
    };

    if (existingId) {
      const existing = await db.salary.get(existingId);
      if (!existing) throw new Error("Salary record not found");
      await db.salary.put({ ...existing, ...payload });
      return existingId;
    }

    const id = crypto.randomUUID();
    await db.salary.add({
      ...payload,
      id,
      createdAt: new Date().toISOString(),
    });
    return id;
  });
}

export async function deleteSalaryRecord(id: string): Promise<void> {
  await db.transaction("rw", db.salary, async () => {
    await db.salary.delete(id);
  });
}

export interface ImportResult {
  categories: number;
  transactions: number;
  budgets: number;
  salary: number;
  skipped: number;
}

export async function importBudgetData(input: ImportFile): Promise<ImportResult> {
  const result: ImportResult = {
    categories: 0,
    transactions: 0,
    budgets: 0,
    salary: 0,
    skipped: 0,
  };
  const now = new Date().toISOString();
  const before = await db.transactions.count();

  await db.transaction(
    "rw",
    db.categories,
    db.transactions,
    db.budgets,
    db.salary,
    async () => {
      const byName = new Map(
        (await db.categories.toArray()).map((category) => [
          category.name.trim().toLowerCase(),
          category,
        ]),
      );

      const ensureCategory = async (item: {
        name: string;
        type: "income" | "expense";
        icon: string;
        color: string;
      }) => {
        const key = item.name.trim().toLowerCase();
        const found = byName.get(key);
        if (found) return found;
        const created = {
          id: crypto.randomUUID(),
          name: item.name.trim(),
          type: item.type,
          icon: item.icon,
          color: item.color,
          monthlyLimit: null,
          archived: false,
          createdAt: now,
        };
        await db.categories.add(created);
        byName.set(key, created);
        result.categories += 1;
        return created;
      };

      for (const item of input.categories) await ensureCategory(item);

      const resolveCategory = (name: string) =>
        byName.get(name.trim().toLowerCase()) ??
        (name.trim() === "" ? byName.get("other") : undefined);

      for (const item of input.transactions) {
        const category = resolveCategory(item.category);
        if (!category) {
          throw new Error(
            `No category named "${item.category}" — list it in the file's categories`,
          );
        }
        const amount = round2(item.amount);
        const duplicate = await db.transactions
          .where("date")
          .equals(item.date)
          .filter(
            (row) =>
              row.amount === amount &&
              row.type === item.type &&
              row.categoryId === category.id &&
              row.note === item.note,
          )
          .count();
        if (duplicate > 0) {
          result.skipped += 1;
          continue;
        }
        await db.transactions.add({
          id: crypto.randomUUID(),
          date: item.date,
          amount,
          type: item.type,
          categoryId: category.id,
          note: item.note,
          recurringId: null,
          createdAt: now,
        });
        result.transactions += 1;
      }

      for (const item of input.budgets) {
        const category = resolveCategory(item.category);
        if (!category) {
          throw new Error(
            `No category named "${item.category}" — list it in the file's categories`,
          );
        }
        const limit = round2(item.limit);
        await db.budgets.put({
          id: budgetId(item.month, category.id),
          month: item.month,
          categoryId: category.id,
          limit,
        });
        result.budgets += 1;
      }

      for (const item of input.salary) {
        const duplicate = await db.salary
          .filter((row) => row.date === item.date && row.label === item.label)
          .count();
        if (duplicate > 0) {
          result.skipped += 1;
          continue;
        }
        await db.salary.add({
          id: crypto.randomUUID(),
          label: item.label,
          date: item.date,
          grossPay: round2(item.grossPay),
          allowances: item.allowances.map((line) => ({
            name: line.name,
            amount: round2(line.amount),
          })),
          deductions: item.deductions.map((line) => ({
            name: line.name,
            amount: round2(line.amount),
          })),
          note: item.note,
          createdAt: now,
        });
        result.salary += 1;
      }
    },
  );

  const after = await db.transactions.count();
  await verify(
    async () => after === before + result.transactions,
    "Could not import all transactions",
  );
  return result;
}
