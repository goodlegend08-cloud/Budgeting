"use client";

import * as React from "react";
import { useAllCategories, useTransactions } from "@/hooks/use-db";
import { useAppStore } from "@/lib/store";
import type { Transaction } from "@/lib/schemas";

export function useFilteredTransactions(): Transaction[] {
  const transactions = useTransactions();
  const categories = useAllCategories();
  const filters = useAppStore((state) => state.filters);

  return React.useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return transactions.filter((transaction) => {
      if (filters.type !== "all" && transaction.type !== filters.type) return false;
      if (filters.categoryId && transaction.categoryId !== filters.categoryId)
        return false;
      if (query) {
        const category = categories.find((item) => item.id === transaction.categoryId);
        const haystack = `${transaction.note} ${category?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [transactions, categories, filters]);
}
