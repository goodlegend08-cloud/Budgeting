"use client";

import { PlusIcon } from "lucide-react";
import { useSettings } from "@/hooks/use-db";
import { useFilteredTransactions } from "@/hooks/use-filtered-transactions";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SummaryCards } from "@/components/transactions/summary-cards";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";

export default function TransactionsPage() {
  const transactions = useFilteredTransactions();
  const settings = useSettings();
  const openCreateDialog = useAppStore((state) => state.openCreateDialog);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Transactions"
        description={`${transactions.length} ${transactions.length === 1 ? "entry" : "entries"}`}
      >
        <Button type="button" onClick={openCreateDialog}>
          <PlusIcon data-icon="inline-start" />
          Add transaction
        </Button>
      </PageHeader>

      <SummaryCards transactions={transactions} currency={settings.currency} />
      <TransactionFilters />
      <TransactionList transactions={transactions} />
    </div>
  );
}
