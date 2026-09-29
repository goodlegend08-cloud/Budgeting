import { budgetId } from "@/lib/budgets";
import { db } from "@/lib/db";
import { round2, localTodayISO } from "@/lib/format";
import { advanceDate, recurringNote } from "@/lib/recurring";
import type {
  CategoryFormValues,
  RecurringFormValues,
  TransactionFormValues,
} from "@/lib/schemas";

export async function saveTransaction(
  values: TransactionFormValues,
  existingId?: string,
): Promise<string> {
  const payload = {
    ...values,
    amount: round2(values.amount),
    note: values.note ?? "",
  };

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
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function setBudgetOverride(
  month: string,
  categoryId: string,
  limit: number | null,
): Promise<void> {
  const id = budgetId(month, categoryId);
  if (limit === null) {
    await db.budgets.delete(id);
    return;
  }
  await db.budgets.put({ id, month, categoryId, limit: round2(limit) });
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
}

export async function setCategoryArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  const category = await db.categories.get(id);
  if (!category) throw new Error("Category not found");
  if (archived && (await activeCountOfType(category.type, id)) === 0) {
    throw new Error(lastOfTypeMessage(category.type));
  }
  await db.categories.update(id, { archived });
}

export async function deleteCategory(id: string): Promise<void> {
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
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const item = await db.recurring.get(id);
  if (!item) throw new Error("Recurring item not found");
  await db.recurring.update(id, { active });
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.transaction("rw", db.recurring, db.transactions, async () => {
    await db.transactions.where("recurringId").equals(id).modify({ recurringId: null });
    await db.recurring.delete(id);
  });
}
