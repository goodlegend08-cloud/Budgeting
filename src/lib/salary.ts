import { localTodayISO, round2 } from "@/lib/format";
import type { SalaryLine } from "@/lib/schemas";

export const ALLOWANCE_PRESETS = ["Overtime", "Bonus", "Allowance", "13th month pay"];

export const DEDUCTION_PRESETS = ["Withholding tax", "SSS", "PhilHealth", "Pag-IBIG"];

export function sumLines(lines: SalaryLine[]): number {
  return round2(lines.reduce((sum, line) => sum + line.amount, 0));
}

export function netPay(input: {
  grossPay: number;
  allowances: SalaryLine[];
  deductions: SalaryLine[];
}): number {
  return round2(
    input.grossPay + sumLines(input.allowances) - sumLines(input.deductions),
  );
}

export const PAYDAY_DAYS = [8, 23] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function paydayISOsInMonth(dateISO: string): [string, string] {
  const [year, month] = dateISO.split("-");
  return [
    `${year}-${month}-${pad(PAYDAY_DAYS[0])}`,
    `${year}-${month}-${pad(PAYDAY_DAYS[1])}`,
  ];
}

function atMidnight(dateISO: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day);
}

let paydayCache = { day: "", payday: { date: "", days: 0 } };

/** Next 8th/23rd pay day from `fromISO` (defaults to today). */
export function nextPayday(fromISO?: string): { date: string; days: number } {
  const today = fromISO ?? localTodayISO();
  if (paydayCache.day === today) return paydayCache.payday;

  const now = atMidnight(today);
  let candidate: Date | null = null;
  for (const day of PAYDAY_DAYS) {
    const possible = new Date(now.getFullYear(), now.getMonth(), day);
    if (possible.getTime() >= now.getTime()) {
      candidate = possible;
      break;
    }
  }
  if (!candidate)
    candidate = new Date(now.getFullYear(), now.getMonth() + 1, PAYDAY_DAYS[0]);

  const payday = {
    date: `${candidate.getFullYear()}-${pad(candidate.getMonth() + 1)}-${pad(candidate.getDate())}`,
    days: Math.round((candidate.getTime() - now.getTime()) / 86_400_000),
  };
  paydayCache = { day: today, payday };
  return payday;
}

export interface SplitSalaryInput {
  label: string;
  date: string;
  grossPay: number;
  allowances: SalaryLine[];
  deductions: SalaryLine[];
  note: string;
}

/** Halve a payslip into records dated the 8th and 23rd of its month. */
export function splitSalary(
  values: SplitSalaryInput,
): [SplitSalaryInput, SplitSalaryInput] {
  const [first, second] = paydayISOsInMonth(values.date);
  const halves = (amount: number): [number, number] => {
    const firstHalf = round2(amount / 2);
    return [firstHalf, round2(amount - firstHalf)];
  };
  const splitLines = (lines: SalaryLine[]): [SalaryLine[], SalaryLine[]] => {
    const head: SalaryLine[] = [];
    const tail: SalaryLine[] = [];
    for (const line of lines) {
      const [a, b] = halves(line.amount);
      head.push({ name: line.name, amount: a });
      tail.push({ name: line.name, amount: b });
    }
    return [head, tail];
  };

  const [grossHead, grossTail] = halves(values.grossPay);
  const [allowHead, allowTail] = splitLines(values.allowances);
  const [deductHead, deductTail] = splitLines(values.deductions);
  const titled = (half: string) => `${values.label} · ${half}`.slice(0, 60).trim();

  return [
    {
      ...values,
      date: first,
      label: titled("1st half"),
      grossPay: grossHead,
      allowances: allowHead,
      deductions: deductHead,
    },
    {
      ...values,
      date: second,
      label: titled("2nd half"),
      grossPay: grossTail,
      allowances: allowTail,
      deductions: deductTail,
    },
  ];
}
