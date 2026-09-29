"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { dailyAllowance } from "@/lib/budgets";
import { formatMoney, formatMonth, localTodayISO, monthOf, round2 } from "@/lib/format";
import {
  useBudgets,
  useCategories,
  useSettings,
  useTransactions,
} from "@/hooks/use-db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  BudgetLimitDialog,
  type BudgetLimitTarget,
} from "@/components/budgets/budget-limit-dialog";
import { BudgetRow, type BudgetRowData } from "@/components/budgets/budget-row";
import { MonthSwitcher } from "@/components/budgets/month-switcher";

function urgency(row: BudgetRowData): number {
  if (row.limit === null) return -1;
  if (row.limit === 0) return row.spent > 0 ? 99 : 0;
  return row.spent / row.limit;
}

interface SummaryCardProps {
  title: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}

function SummaryCard({ title, value, tone = "default" }: SummaryCardProps) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="grid gap-1 p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function BudgetsPage() {
  const [month, setMonth] = React.useState(() => monthOf(localTodayISO()));
  const [target, setTarget] = React.useState<BudgetLimitTarget | null>(null);

  const transactions = useTransactions();
  const categories = useCategories("expense");
  const overrides = useBudgets(month);
  const settings = useSettings();
  const currency = settings.currency;

  const monthExpenses = React.useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.type === "expense" && monthOf(transaction.date) === month,
      ),
    [transactions, month],
  );

  const spentByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const transaction of monthExpenses) {
      map.set(
        transaction.categoryId,
        round2((map.get(transaction.categoryId) ?? 0) + transaction.amount),
      );
    }
    return map;
  }, [monthExpenses]);

  const rows = React.useMemo(() => {
    const list: BudgetRowData[] = categories.map((category) => ({
      category,
      spent: round2(spentByCategory.get(category.id) ?? 0),
      limit: overrides.get(category.id) ?? category.monthlyLimit,
      hasOverride: overrides.has(category.id),
    }));
    return list.sort(
      (a, b) =>
        urgency(b) - urgency(a) || a.category.name.localeCompare(b.category.name),
    );
  }, [categories, spentByCategory, overrides]);

  const budgetTotal = round2(rows.reduce((total, row) => total + (row.limit ?? 0), 0));
  const budgetedSpent = round2(
    rows.reduce((total, row) => total + (row.limit === null ? 0 : row.spent), 0),
  );
  const unbudgetedSpent = round2(
    rows.reduce((total, row) => total + (row.limit === null ? row.spent : 0), 0),
  );
  const left = round2(budgetTotal - budgetedSpent);
  const hasLimits = rows.some((row) => row.limit !== null);
  const allowance = dailyAllowance(month, left);
  function handleEdit(row: BudgetRowData) {
    setTarget({
      category: row.category,
      month,
      currentLimit: row.limit,
      hasOverride: row.hasOverride,
    });
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Budgets"
        description={`Plan ${formatMonth(month)} by category`}
      >
        <MonthSwitcher month={month} onChange={setMonth} />
      </PageHeader>

      {categories.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <div className="grid gap-1">
            <p className="text-sm font-medium">No expense categories yet</p>
            <p className="text-sm text-muted-foreground">
              Create categories first, then set limits on them.
            </p>
          </div>
          <Link
            href="/categories"
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
          >
            Go to categories
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              title={`Budget · ${formatMonth(month)}`}
              value={hasLimits ? formatMoney(budgetTotal, currency) : "—"}
            />
            <SummaryCard
              title="Spent in budgets"
              value={formatMoney(budgetedSpent, currency)}
            />
            <SummaryCard
              title="Left"
              value={formatMoney(left, currency)}
              tone={left < 0 ? "negative" : "positive"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {allowance && (
              <span className="font-medium text-foreground">
                ≈ {formatMoney(allowance.perDay, currency)}/day for the next{" "}
                {allowance.daysLeft} {allowance.daysLeft === 1 ? "day" : "days"}
              </span>
            )}
            {unbudgetedSpent > 0 && (
              <span>Plus {formatMoney(unbudgetedSpent, currency)} outside budgets</span>
            )}
          </div>

          {!hasLimits && (
            <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              No limits set for this month yet — use the pencil on any category to set
              one.
            </div>
          )}

          <div className="grid gap-3">
            {rows.map((row) => (
              <BudgetRow
                key={row.category.id}
                row={row}
                currency={currency}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </>
      )}

      <BudgetLimitDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
