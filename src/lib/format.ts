import { format, isToday, isYesterday, parseISO } from "date-fns";

export const DEFAULT_CURRENCY = "USD";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Math.abs(round2(amount)));
  return amount < 0 ? `-${formatted}` : formatted;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function localTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function formatDayHeading(dateISO: string): string {
  const date = parseISO(dateISO);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, d MMMM yyyy");
}

export function formatDayShort(dateISO: string): string {
  return format(parseISO(dateISO), "d MMM");
}

export function formatMonth(month: string): string {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
}
