import Dexie, { type EntityTable } from "dexie";
import type {
  BudgetOverride,
  Category,
  Recurring,
  SalaryRecord,
  Settings,
  Transaction,
} from "@/lib/schemas";
import { DEFAULT_CATEGORIES } from "@/lib/seed";
import { DEFAULT_CURRENCY } from "@/lib/format";

export class BudgetDatabase extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  budgets!: EntityTable<BudgetOverride, "id">;
  recurring!: EntityTable<Recurring, "id">;
  salary!: EntityTable<SalaryRecord, "id">;
  settings!: EntityTable<Settings, "key">;

  constructor() {
    super("budget-tracker");
    this.version(1).stores({
      transactions: "id, date, categoryId, type, recurringId",
      categories: "id, type, name",
      budgets: "id, month, categoryId",
      recurring: "id, nextDueDate",
      settings: "key",
    });
    this.version(2).stores({
      transactions: "id, date, categoryId, type, recurringId",
      categories: "id, type, name",
      budgets: "id, month, categoryId",
      recurring: "id, nextDueDate",
      salary: "id, date",
      settings: "key",
    });
  }
}

export const db = new BudgetDatabase();

let seeded: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  seeded ??= seed();
  return seeded;
}

async function seed(): Promise<void> {
  const count = await db.categories.count();
  if (count > 0) {
    await ensureSettings();
    return;
  }
  const now = new Date().toISOString();
  await db.transaction("rw", db.categories, db.settings, async () => {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        id: crypto.randomUUID(),
        archived: false,
        createdAt: now,
      })),
    );
    await ensureSettings();
  });
}

async function ensureSettings(): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const existing = await db.settings.get("app");
    if (!existing) {
      await db.settings.put({
        key: "app",
        currency: DEFAULT_CURRENCY,
        monthStartDay: 1,
      });
      return;
    }
    // Migrate browsers seeded with the old USD default over to Peso.
    if (existing.currency === "USD") {
      await db.settings.update("app", { currency: DEFAULT_CURRENCY });
    }
  });
}
