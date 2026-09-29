import { addMonths, format, parseISO } from "date-fns";
import { localTodayISO, monthOf, round2 } from "@/lib/format";

export function budgetId(month: string, categoryId: string): string {
  return `${month}:${categoryId}`;
}

export function shiftMonth(month: string, delta: number): string {
  return format(addMonths(parseISO(`${month}-01`), delta), "yyyy-MM");
}

export function isCurrentMonth(month: string): boolean {
  return month === monthOf(localTodayISO());
}

export function daysLeftInMonth(month: string): number {
  const today = localTodayISO();
  if (month !== monthOf(today)) return 0;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const todayDay = Number(today.slice(8, 10));
  return lastDay - todayDay + 1;
}

export interface DailyAllowance {
  perDay: number;
  daysLeft: number;
}

export function dailyAllowance(
  month: string,
  remaining: number,
): DailyAllowance | null {
  const daysLeft = daysLeftInMonth(month);
  if (!isCurrentMonth(month) || daysLeft <= 0 || remaining <= 0) return null;
  return { perDay: round2(remaining / daysLeft), daysLeft };
}
