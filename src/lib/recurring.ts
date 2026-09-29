import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { localTodayISO } from "@/lib/format";
import type { Recurring } from "@/lib/schemas";

export type Frequency = Recurring["frequency"];

const adders: Record<Frequency, (date: Date, step: number) => Date> = {
  daily: (date, step) => addDays(date, step),
  weekly: (date, step) => addWeeks(date, step),
  monthly: (date, step) => addMonths(date, step),
  yearly: (date, step) => addYears(date, step),
};

export const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly", "yearly"];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function frequencyLabel(frequency: Frequency): string {
  return FREQUENCY_LABELS[frequency];
}

export function advanceDate(dateISO: string, frequency: Frequency, step = 1): string {
  return format(adders[frequency](parseISO(dateISO), step), "yyyy-MM-dd");
}

export function recurringNote(item: Pick<Recurring, "name" | "note">): string {
  const detail = item.note.trim();
  return detail ? `${item.name} — ${detail}` : item.name;
}

export type DueKind = "paused" | "overdue" | "due-soon" | "scheduled";

export interface DueStatus {
  kind: DueKind;
  label: string;
  days: number;
}

export function dueStatus(
  item: Pick<Recurring, "active" | "nextDueDate">,
  today: string = localTodayISO(),
): DueStatus {
  const days = Math.round(
    (parseISO(item.nextDueDate).getTime() - parseISO(today).getTime()) / 86_400_000,
  );
  if (!item.active) return { kind: "paused", label: "Paused", days };
  if (days < 0) return { kind: "overdue", label: "Overdue", days };
  if (days === 0) return { kind: "due-soon", label: "Due today", days };
  if (days === 1) return { kind: "due-soon", label: "Due tomorrow", days };
  return { kind: "scheduled", label: `Due in ${days} days`, days };
}
