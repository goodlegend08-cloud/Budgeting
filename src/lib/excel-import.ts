import type { ImportFile } from "@/lib/schemas";
import type { WorkSheet } from "xlsx";

type Cell = string | number | boolean | Date | null | undefined;
type Row = Cell[];

export interface ExcelParseResult {
  data: ImportFile;
  mode: "blocks" | "table" | "none";
  sheets: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const CATEGORY_FALLBACK = { name: "Other", icon: "📝", color: "#78716c" };

function mapItem(name: string) {
  const key = name.trim().toLowerCase();
  if (key.includes("utang") || key.includes("debt") || key.includes("loan")) {
    return { name: "Debts", icon: "💸", color: "#f43f5e" };
  }
  if (key.includes("savings") || key.includes("ipon")) {
    return { name: "Savings", icon: "🏦", color: "#0d9488" };
  }
  if (key.includes("necessit") || key.includes("grocer") || key.includes("market")) {
    return { name: "Necessities", icon: "🧺", color: "#f59e0b" };
  }
  if (
    key.includes("gas") ||
    key.includes("transport") ||
    key.includes("fare") ||
    key.includes("jeep") ||
    key.includes("grab")
  ) {
    return { name: "Transport", icon: "🚇", color: "#0ea5e9" };
  }
  if (
    key.includes("notary") ||
    key.includes("landbank") ||
    key.includes("passport") ||
    key.includes("document")
  ) {
    return { name: "Fees & Documents", icon: "📄", color: "#64748b" };
  }
  if (
    key.includes("vac") ||
    key.includes("washing") ||
    key.includes("shop") ||
    key.includes("clothes")
  ) {
    return { name: "Shopping", icon: "🛍️", color: "#ec4899" };
  }
  return null;
}

function monthOfText(text: Cell): number | null {
  if (text instanceof Date) return text.getMonth() + 1;
  if (typeof text !== "string") return null;
  const found = text.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const word of found) {
    const month = MONTHS[word];
    if (month) return month;
  }
  return null;
}

function nextMonth(month: number): { year: number; month: number } {
  return month === 12 ? { year: 2027, month: 1 } : { year: 2026, month: month + 1 };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toISO(value: Cell, month: number): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    const named = text.match(/([a-z]+)\s+(\d{1,2})/i);
    if (named && MONTHS[named[1].toLowerCase()]) {
      return `2026-${pad(MONTHS[named[1].toLowerCase()])}-${pad(Number(named[2]))}`;
    }
    const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const slashed = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (slashed) {
      const year = slashed[3].length === 2 ? `20${slashed[3]}` : slashed[3];
      return `${year}-${pad(Number(slashed[1]))}-${pad(Number(slashed[2]))}`;
    }
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return toISO(parsed, month);
  }
  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 86_400_000);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  return `2026-${pad(month)}-15`;
}

function toAmount(value: Cell): number {
  if (typeof value === "number") return Math.abs(value);
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function findLabelColumn(rows: Row[]): number {
  for (const row of rows.slice(0, 40)) {
    for (let index = 0; index < Math.min(row.length, 8); index += 1) {
      const text = String(row[index] ?? "").trim();
      if (text.startsWith("Block ") || text === "Item / Name") return index;
    }
  }
  return 1;
}

function sheetMonth(rows: Row[], sheetName: string): number | null {
  const named = monthOfText(sheetName);
  if (named) return named;
  for (const row of rows.slice(0, 12)) {
    for (const cell of row) {
      const month = monthOfText(cell);
      if (month) return month;
    }
  }
  return null;
}

interface BlockData {
  categories: Map<
    string,
    { name: string; type: "expense"; icon: string; color: string }
  >;
  transactions: ImportFile["transactions"];
  budgets: Map<string, { month: string; category: string; limit: number }>;
  salary: ImportFile["salary"];
  sheets: string[];
}

function emptyBlockData(): BlockData {
  return {
    categories: new Map(),
    transactions: [],
    budgets: new Map(),
    salary: [],
    sheets: [],
  };
}

function ensureCategory(data: BlockData, name: string, icon: string, color: string) {
  if (!data.categories.has(name)) {
    data.categories.set(name, { name, type: "expense", icon, color });
  }
}

function parseBlocks(sheetName: string, rows: Row[], data: BlockData) {
  const month = sheetMonth(rows, sheetName);
  if (!month) return;
  const labelCol = findLabelColumn(rows);
  const dateCol = labelCol + 1;
  const amountCol = labelCol + 2;

  let gross: number | null = null;
  let deductions: number | null = null;
  let partsTotal = 0;
  const grossParts: string[] = [];
  for (const row of rows) {
    const label = String(row[labelCol] ?? "").trim();
    const amount = row[amountCol];
    if (label === "Total Gross" && typeof amount === "number") {
      gross = amount;
    } else if (label === "Standard Deductions" && typeof amount === "number") {
      deductions = Math.abs(amount);
    } else if (
      (label === "SG2 Basic" || label === "PERA") &&
      typeof amount === "number"
    ) {
      partsTotal += amount;
      grossParts.push(
        `${label} ₱${amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })}`,
      );
    }
  }
  if (gross === null && partsTotal > 0) gross = partsTotal;
  if (gross !== null) {
    data.salary.push({
      date: `2026-${pad(month)}-15`,
      label: `${sheetName} 2026 Salary`,
      grossPay: Math.round(gross * 100) / 100,
      allowances: [],
      deductions:
        deductions !== null
          ? [
              {
                name: "Standard deductions",
                amount: Math.round(deductions * 100) / 100,
              },
            ]
          : [],
      note: grossParts.join(" + "),
    });
    data.sheets.push(sheetName);
  }

  let section: number | null = null;
  for (const row of rows) {
    const label = String(row[labelCol] ?? "").trim();
    const block = label.match(/^Block (\d+):/);
    if (block) {
      section = Number(block[1]);
      continue;
    }
    if (label.startsWith("Bottom Line")) {
      section = null;
      continue;
    }
    if (section === null || section === 1) continue;
    if (label === "" || label === "Item / Name" || label.startsWith("Total ")) continue;

    const raw = row[amountCol];
    const amount = toAmount(raw);
    if (amount <= 0) continue;
    const mapped = mapItem(label) ?? CATEGORY_FALLBACK;
    ensureCategory(data, mapped.name, mapped.icon, mapped.color);
    data.transactions.push({
      date: toISO(row[dateCol], month),
      amount: Math.round(amount * 100) / 100,
      type: "expense",
      category: mapped.name,
      note: label,
    });

    const plan = section >= 4 ? nextMonth(month) : { year: 2026, month };
    const budgetMonth = `${plan.year}-${pad(plan.month)}`;
    const key = `${budgetMonth}-${mapped.name}`;
    const existing = data.budgets.get(key);
    data.budgets.set(key, {
      month: budgetMonth,
      category: mapped.name,
      limit: Math.round(((existing?.limit ?? 0) + amount) * 100) / 100,
    });
    if (!data.sheets.includes(sheetName)) data.sheets.push(sheetName);
  }
}

const LABEL_HEADERS = [
  "description",
  "details",
  "detail",
  "item",
  "name",
  "particulars",
  "particular",
  "note",
  "remarks",
  "remark",
  "narration",
  "payee",
  "expense",
];
const DATE_HEADERS = ["date", "day", "txn date", "transaction date"];
const AMOUNT_HEADERS = ["amount", "amt", "cost", "price", "value", "amount (₱)"];
const CATEGORY_HEADERS = ["category", "type", "group", "tag"];
const BUDGET_HEADERS = ["budget", "limit", "budgeted", "planned"];

interface TableData {
  categories: Map<
    string,
    { name: string; type: "expense"; icon: string; color: string }
  >;
  transactions: ImportFile["transactions"];
  budgets: Map<string, { month: string; category: string; limit: number }>;
  sheets: string[];
}

function parseTable(sheetName: string, rows: Row[], out: TableData): boolean {
  const month =
    monthOfText(sheetName) ?? monthOfText(rows[0]?.[0]) ?? new Date().getMonth() + 1;
  let headerRow = -1;
  let labelCol = -1;
  let amountCol = -1;
  let dateCol = -1;
  let categoryCol = -1;
  let budgetCol = -1;

  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const row = rows[index];
    const foundLabel = row.findIndex((cell) =>
      LABEL_HEADERS.includes(
        String(cell ?? "")
          .trim()
          .toLowerCase(),
      ),
    );
    const foundAmount = row.findIndex((cell) =>
      AMOUNT_HEADERS.includes(
        String(cell ?? "")
          .trim()
          .toLowerCase(),
      ),
    );
    if (foundLabel >= 0 && foundAmount >= 0) {
      headerRow = index;
      labelCol = foundLabel;
      amountCol = foundAmount;
      dateCol = row.findIndex((cell) =>
        DATE_HEADERS.includes(
          String(cell ?? "")
            .trim()
            .toLowerCase(),
        ),
      );
      categoryCol = row.findIndex((cell) =>
        CATEGORY_HEADERS.includes(
          String(cell ?? "")
            .trim()
            .toLowerCase(),
        ),
      );
      budgetCol = row.findIndex((cell) =>
        BUDGET_HEADERS.includes(
          String(cell ?? "")
            .trim()
            .toLowerCase(),
        ),
      );
      break;
    }
  }
  if (headerRow < 0) return false;

  let found = 0;
  for (let index = headerRow + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const label = String(row[labelCol] ?? "").trim();
    const amount = toAmount(row[amountCol]);
    if (!label && amount <= 0) continue;
    if (!label || amount <= 0) continue;

    const named = categoryCol >= 0 ? String(row[categoryCol] ?? "").trim() : "";
    const mapped =
      (named ? { name: named, icon: "📝", color: "#78716c" } : null) ??
      mapItem(label) ??
      CATEGORY_FALLBACK;
    if (!out.categories.has(mapped.name)) {
      out.categories.set(mapped.name, {
        name: mapped.name,
        type: "expense",
        icon: mapped.icon,
        color: mapped.color,
      });
    }
    out.transactions.push({
      date: toISO(dateCol >= 0 ? row[dateCol] : null, month),
      amount: Math.round(amount * 100) / 100,
      type: "expense",
      category: mapped.name,
      note: label,
    });
    found += 1;

    if (budgetCol >= 0) {
      const budget = toAmount(row[budgetCol]);
      if (budget > 0) {
        const key = `2026-${pad(month)}-${mapped.name}`;
        out.budgets.set(key, {
          month: `2026-${pad(month)}`,
          category: mapped.name,
          limit: Math.round(budget * 100) / 100,
        });
      }
    }
  }
  if (found && !out.sheets.includes(sheetName)) out.sheets.push(sheetName);
  return found > 0;
}

function finish(
  categories: TableData["categories"] | BlockData["categories"],
  extra: {
    transactions: ImportFile["transactions"];
    budgets: TableData["budgets"];
    salary: ImportFile["salary"];
  },
): ImportFile {
  return {
    version: 1,
    source: "",
    categories: [...categories.values()],
    transactions: extra.transactions,
    budgets: [...extra.budgets.values()],
    salary: extra.salary,
    removeTransactions: [],
    removeBudgets: [],
  };
}

export async function excelToImport(bytes: ArrayBuffer): Promise<ExcelParseResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(bytes), { type: "array", cellDates: true });

  const blockData = emptyBlockData();
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(
      workbook.Sheets[sheetName] as WorkSheet,
      {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false,
      },
    );
    parseBlocks(sheetName, rows, blockData);
  }

  if (blockData.transactions.length > 0) {
    const data = finish(blockData.categories, {
      transactions: blockData.transactions,
      budgets: blockData.budgets,
      salary: blockData.salary,
    });
    data.source = `Excel workbook — ${blockData.sheets.join(", ")}`;
    return { data, mode: "blocks", sheets: blockData.sheets };
  }

  const table: TableData = {
    categories: new Map(),
    transactions: [],
    budgets: new Map(),
    sheets: [],
  };
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(
      workbook.Sheets[sheetName] as WorkSheet,
      {
        header: 1,
        raw: true,
        defval: null,
        blankrows: false,
      },
    );
    parseTable(sheetName, rows, table);
  }

  if (table.transactions.length > 0) {
    const data = finish(table.categories, {
      transactions: table.transactions,
      budgets: table.budgets,
      salary: [],
    });
    data.source = `Excel workbook — table layout (${table.sheets.join(", ")})`;
    return { data, mode: "table", sheets: table.sheets };
  }

  const empty: ImportFile = {
    version: 1,
    source: "Excel workbook — no rows recognised",
    categories: [],
    transactions: [],
    budgets: [],
    salary: [],
    removeTransactions: [],
    removeBudgets: [],
  };
  return { data: empty, mode: "none", sheets: [] };
}
