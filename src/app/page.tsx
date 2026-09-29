"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { useAllCategories, useSettings, useTransactions } from "@/hooks/use-db";
import { formatMonth, localTodayISO, monthOf, round2 } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthSwitcher } from "@/components/budgets/month-switcher";
import type { CategorySlice } from "@/components/charts/category-breakdown";
import type { SpendPoint } from "@/components/charts/spend-over-time";
import { SummaryCards } from "@/components/transactions/summary-cards";
import { TransactionList } from "@/components/transactions/transaction-list";

function ChartFallback() {
  return <div className="h-[220px] w-full animate-pulse rounded-lg bg-muted" />;
}

const SpendOverTime = dynamic(() => import("@/components/charts/spend-over-time"), {
  ssr: false,
  loading: () => <ChartFallback />,
});

const CategoryBreakdown = dynamic(
  () => import("@/components/charts/category-breakdown"),
  { ssr: false, loading: () => <ChartFallback /> },
);

const MAX_SLICES = 6;

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="grid h-[220px] place-items-center text-center text-sm text-muted-foreground">
            Nothing recorded yet for this month.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = React.useState(() => monthOf(localTodayISO()));

  const transactions = useTransactions();
  const categories = useAllCategories();
  const settings = useSettings();
  const openCreateDialog = useAppStore((state) => state.openCreateDialog);
  const currency = settings.currency;

  const monthTransactions = React.useMemo(
    () => transactions.filter((transaction) => monthOf(transaction.date) === month),
    [transactions, month],
  );

  const hasSpending = monthTransactions.some(
    (transaction) => transaction.type === "expense",
  );

  const dailyPoints = React.useMemo<SpendPoint[]>(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const byDay = new Map<number, number>();
    for (const transaction of monthTransactions) {
      if (transaction.type !== "expense") continue;
      const day = Number(transaction.date.slice(8, 10));
      byDay.set(day, round2((byDay.get(day) ?? 0) + transaction.amount));
    }
    return Array.from({ length: daysInMonth }, (_, index) => ({
      label: String(index + 1),
      amount: byDay.get(index + 1) ?? 0,
    }));
  }, [monthTransactions, month]);

  const categorySlices = React.useMemo<CategorySlice[]>(() => {
    const byCategory = new Map<string, number>();
    for (const transaction of monthTransactions) {
      if (transaction.type !== "expense") continue;
      byCategory.set(
        transaction.categoryId,
        round2((byCategory.get(transaction.categoryId) ?? 0) + transaction.amount),
      );
    }

    const sorted = [...byCategory.entries()]
      .map(([categoryId, amount]) => {
        const category = categories.find((item) => item.id === categoryId);
        return {
          id: categoryId,
          name: category?.name ?? "Uncategorized",
          color: category?.color ?? "#78716c",
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);
    if (rest.length > 0) {
      top.push({
        id: "__other__",
        name: `Other (${rest.length})`,
        color: "#78716c",
        amount: round2(rest.reduce((sum, slice) => sum + slice.amount, 0)),
      });
    }
    return top;
  }, [monthTransactions, categories]);

  const recent = monthTransactions.slice(0, 5);

  return (
    <div className="grid gap-6">
      <PageHeader title="Dashboard" description={`Overview of ${formatMonth(month)}`}>
        <MonthSwitcher month={month} onChange={setMonth} />
        <Button type="button" onClick={openCreateDialog}>
          <PlusIcon data-icon="inline-start" />
          Add transaction
        </Button>
      </PageHeader>

      <SummaryCards transactions={monthTransactions} currency={currency} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Spend over time" empty={!hasSpending}>
          <SpendOverTime points={dailyPoints} currency={currency} />
        </ChartCard>

        <ChartCard title="By category" empty={categorySlices.length === 0}>
          <CategoryBreakdown slices={categorySlices} currency={currency} />
        </ChartCard>
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <TransactionList transactions={recent} />
      </section>
    </div>
  );
}
