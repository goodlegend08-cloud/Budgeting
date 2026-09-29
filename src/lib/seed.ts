import type { Category } from "@/lib/schemas";

type SeedCategory = Pick<Category, "name" | "type" | "icon" | "color" | "monthlyLimit">;

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    name: "Housing",
    type: "expense",
    icon: "🏠",
    color: "#6366f1",
    monthlyLimit: null,
  },
  {
    name: "Groceries",
    type: "expense",
    icon: "🛒",
    color: "#22c55e",
    monthlyLimit: null,
  },
  { name: "Dining", type: "expense", icon: "🍔", color: "#f97316", monthlyLimit: null },
  {
    name: "Transport",
    type: "expense",
    icon: "🚇",
    color: "#0ea5e9",
    monthlyLimit: null,
  },
  {
    name: "Utilities",
    type: "expense",
    icon: "💡",
    color: "#eab308",
    monthlyLimit: null,
  },
  { name: "Health", type: "expense", icon: "🩺", color: "#ef4444", monthlyLimit: null },
  {
    name: "Shopping",
    type: "expense",
    icon: "🛍️",
    color: "#ec4899",
    monthlyLimit: null,
  },
  { name: "Fun", type: "expense", icon: "🎬", color: "#a855f7", monthlyLimit: null },
  {
    name: "Learning",
    type: "expense",
    icon: "📚",
    color: "#14b8a6",
    monthlyLimit: null,
  },
  { name: "Other", type: "expense", icon: "📝", color: "#78716c", monthlyLimit: null },
  { name: "Salary", type: "income", icon: "💼", color: "#16a34a", monthlyLimit: null },
  {
    name: "Freelance",
    type: "income",
    icon: "💻",
    color: "#2563eb",
    monthlyLimit: null,
  },
  {
    name: "Other income",
    type: "income",
    icon: "🎁",
    color: "#d97706",
    monthlyLimit: null,
  },
];
