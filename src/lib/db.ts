import Dexie, { type EntityTable } from "dexie";
import type {
  BudgetOverride,
  Category,
  Recurring,
  Settings,
  Transaction,
} from "@/lib/schemas";
import { DEFAULT_CATEGORIES } from "@/lib/seed";

export class BudgetDatabase extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  budgets!: EntityTable<BudgetOverride, "id">;
  recurring!: EntityTable<Recurring, "id">;
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
  await db.categories.bulkAdd(
    DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      id: crypto.randomUUID(),
      archived: false,
      createdAt: now,
    })),
  );
  await ensureSettings();
}

async function ensureSettings(): Promise<void> {
  const existing = await db.settings.get("app");
  if (!existing) {
    await db.settings.put({
      key: "app",
      currency: "USD",
      monthStartDay: 1,
    });
  }
}
