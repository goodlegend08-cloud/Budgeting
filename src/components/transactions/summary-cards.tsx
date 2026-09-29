"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, WalletIcon } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { round2 } from "@/lib/format";
import type { Transaction } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardsProps {
  transactions: Transaction[];
  currency: string;
}

export function SummaryCards({ transactions, currency }: SummaryCardsProps) {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === "income") income += transaction.amount;
    else expense += transaction.amount;
  }
  const balance = round2(income - expense);

  const items = [
    {
      title: "Income",
      value: formatMoney(income, currency),
      icon: ArrowUpRightIcon,
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Spent",
      value: formatMoney(expense, currency),
      icon: ArrowDownRightIcon,
      className: "text-destructive",
    },
    {
      title: "Balance",
      value: formatMoney(balance, currency),
      icon: WalletIcon,
      className: "text-foreground",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            <item.icon className={`size-4 ${item.className}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold tabular-nums ${item.className}`}>
              {item.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
