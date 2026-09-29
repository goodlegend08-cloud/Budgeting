import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { DEFAULT_CURRENCY } from "@/lib/format";
import type {
  Category,
  Recurring,
  Settings,
  Transaction,
  TransactionType,
} from "@/lib/schemas";

const emptyCategories: Category[] = [];
const emptyTransactions: Transaction[] = [];
const emptyRecurring: Recurring[] = [];
const emptyUsage = new Map<string, number>();
const emptyLimits = new Map<string, number>();

const defaultSettings: Settings = {
  key: "app",
  currency: DEFAULT_CURRENCY,
  monthStartDay: 1,
};

export function useCategories(type?: TransactionType): Category[] {
  const categories = useLiveQuery(
    async () => {
      const all = await db.categories.toArray();
      return all
        .filter((category) => !category.archived)
        .filter((category) => (type ? category.type === type : true))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [type],
    emptyCategories,
  );
  return categories ?? emptyCategories;
}

export function useAllCategories(): Category[] {
  const categories = useLiveQuery(
    async () => {
      const all = await db.categories.toArray();
      return all.sort((a, b) => a.name.localeCompare(b.name));
    },
    [],
    emptyCategories,
  );
  return categories ?? emptyCategories;
}

export function useCategoryUsage(): Map<string, number> {
  const usage = useLiveQuery(
    async () => {
      const counts = new Map<string, number>();
      const transactions = await db.transactions.toArray();
      for (const transaction of transactions) {
        counts.set(
          transaction.categoryId,
          (counts.get(transaction.categoryId) ?? 0) + 1,
        );
      }
      return counts;
    },
    [],
    emptyUsage,
  );
  return usage ?? emptyUsage;
}

export function useBudgets(month: string): Map<string, number> {
  const overrides = useLiveQuery(
    async () => {
      const rows = await db.budgets.where("month").equals(month).toArray();
      return new Map(rows.map((row) => [row.categoryId, row.limit]));
    },
    [month],
    emptyLimits,
  );
  return overrides ?? emptyLimits;
}

export function useTransactions(): Transaction[] {
  const transactions = useLiveQuery(
    () => db.transactions.orderBy("date").reverse().toArray(),
    [],
    emptyTransactions,
  );
  return transactions ?? emptyTransactions;
}

export function useRecurring(): Recurring[] {
  const items = useLiveQuery(
    async () => {
      const all = await db.recurring.toArray();
      return all.sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          a.nextDueDate.localeCompare(b.nextDueDate) ||
          a.name.localeCompare(b.name),
      );
    },
    [],
    emptyRecurring,
  );
  return items ?? emptyRecurring;
}

export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get("app"), [], defaultSettings);
  return settings ?? defaultSettings;
}
