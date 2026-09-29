import { round2 } from "@/lib/format";
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
