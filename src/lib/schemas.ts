import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  type: transactionTypeSchema,
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  monthlyLimit: z.number().nonnegative().nullable(),
  archived: z.boolean(),
  createdAt: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const transactionSchema = z.object({
  id: z.string(),
  date: isoDateSchema,
  amount: z.number().positive(),
  type: transactionTypeSchema,
  categoryId: z.string().min(1),
  note: z.string().max(200),
  recurringId: z.string().nullable(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const transactionFormSchema = z.object({
  type: transactionTypeSchema,
  amount: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? NaN : value),
    z.coerce
      .number({ error: "Enter an amount" })
      .positive("Amount must be greater than zero")
      .max(1_000_000_000, "Amount is too large"),
  ),
  date: isoDateSchema,
  categoryId: z.string().min(1, "Choose a category"),
  note: z.string().max(200, "Note is too long").default(""),
});
export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const categoryFormSchema = z.object({
  name: z
    .string({ error: "Enter a name" })
    .trim()
    .min(1, "Enter a name")
    .max(40, "Name is too long"),
  type: transactionTypeSchema,
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color"),
  monthlyLimit: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce
      .number({ error: "Enter a valid limit" })
      .nonnegative("Limit cannot be negative")
      .max(1_000_000_000, "Limit is too large")
      .nullable(),
  ),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const budgetOverrideSchema = z.object({
  id: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.string(),
  limit: z.number().nonnegative(),
});
export type BudgetOverride = z.infer<typeof budgetOverrideSchema>;

export const budgetFormSchema = z.object({
  limit: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? NaN : value),
    z.coerce
      .number({ error: "Enter a limit" })
      .nonnegative("Limit cannot be negative")
      .max(1_000_000_000, "Limit is too large"),
  ),
});
export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export const recurringSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  amount: z.number().positive(),
  type: transactionTypeSchema,
  categoryId: z.string(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  startDate: isoDateSchema,
  nextDueDate: isoDateSchema,
  active: z.boolean(),
  note: z.string().max(200),
  createdAt: z.string(),
});
export type Recurring = z.infer<typeof recurringSchema>;

export const recurringFormSchema = z.object({
  name: z
    .string({ error: "Enter a name" })
    .trim()
    .min(1, "Enter a name")
    .max(60, "Name is too long"),
  amount: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? NaN : value),
    z.coerce
      .number({ error: "Enter an amount" })
      .positive("Amount must be greater than zero")
      .max(1_000_000_000, "Amount is too large"),
  ),
  type: transactionTypeSchema,
  categoryId: z.string().min(1, "Choose a category"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"], {
    error: "Choose how often",
  }),
  startDate: isoDateSchema,
  note: z.string().max(200, "Note is too long").default(""),
});
export type RecurringFormValues = z.infer<typeof recurringFormSchema>;

export const settingsSchema = z.object({
  key: z.literal("app"),
  currency: z.string().length(3),
  monthStartDay: z.number().int().min(1).max(28),
});
export type Settings = z.infer<typeof settingsSchema>;

export const salaryLineSchema = z.object({
  name: z.string().min(1).max(40),
  amount: z.number().nonnegative(),
});
export type SalaryLine = z.infer<typeof salaryLineSchema>;

export const salaryRecordSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(60),
  date: isoDateSchema,
  grossPay: z.number().positive(),
  allowances: z.array(salaryLineSchema),
  deductions: z.array(salaryLineSchema),
  note: z.string().max(200),
  createdAt: z.string(),
});
export type SalaryRecord = z.infer<typeof salaryRecordSchema>;

const salaryLineFormSchema = z.object({
  name: z
    .string({ error: "Enter a name" })
    .trim()
    .min(1, "Enter a name")
    .max(40, "Name is too long"),
  amount: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : value),
    z.coerce
      .number({ error: "Enter an amount" })
      .nonnegative("Amount cannot be negative")
      .max(1_000_000_000, "Amount is too large"),
  ),
});

export const salaryFormSchema = z.object({
  label: z
    .string({ error: "Enter a label" })
    .trim()
    .min(1, "Enter a label")
    .max(60, "Label is too long"),
  date: isoDateSchema,
  grossPay: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? NaN : value),
    z.coerce
      .number({ error: "Enter gross pay" })
      .positive("Gross pay must be greater than zero")
      .max(1_000_000_000, "Amount is too large"),
  ),
  allowances: z.array(salaryLineFormSchema),
  deductions: z.array(salaryLineFormSchema),
  note: z.string().max(200, "Note is too long").default(""),
});
export type SalaryFormValues = z.infer<typeof salaryFormSchema>;

export const importCategorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: transactionTypeSchema.default("expense"),
  icon: z.string().min(1).default("📝"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#78716c"),
});

export const importTransactionSchema = z.object({
  date: isoDateSchema,
  amount: z.coerce
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
  type: transactionTypeSchema.default("expense"),
  category: z.string().min(1),
  note: z.string().max(200).default(""),
});

export const importBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must look like 2026-09"),
  category: z.string().min(1),
  limit: z.coerce
    .number({ error: "Limit must be a number" })
    .nonnegative("Limit cannot be negative"),
});

export const importSalarySchema = z.object({
  date: isoDateSchema,
  label: z.string().min(1).max(60),
  grossPay: z.coerce
    .number({ error: "Gross pay must be a number" })
    .positive("Gross pay must be greater than zero"),
  allowances: z.array(salaryLineSchema).default([]),
  deductions: z.array(salaryLineSchema).default([]),
  note: z.string().max(200).default(""),
});

export const removeTransactionSchema = z.object({
  category: z.string().min(1),
  note: z.string().min(1),
});

export const removeBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must look like 2026-09"),
  category: z.string().min(1),
});

export const importFileSchema = z.object({
  version: z.preprocess(
    (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
      if (typeof value === "string") {
        const numeric = Number(value.trim().replace(/^v/i, ""));
        if (Number.isFinite(numeric)) return Math.trunc(numeric);
      }
      return 1;
    },
    z.literal(1, { error: "Expected 1 (this importer reads version 1 files)" }),
  ),
  source: z.string().max(200).optional(),
  categories: z.array(importCategorySchema).default([]),
  transactions: z.array(importTransactionSchema).default([]),
  budgets: z.array(importBudgetSchema).default([]),
  salary: z.array(importSalarySchema).default([]),
  removeTransactions: z.array(removeTransactionSchema).default([]),
  removeBudgets: z.array(removeBudgetSchema).default([]),
});
export type ImportFile = z.infer<typeof importFileSchema>;
