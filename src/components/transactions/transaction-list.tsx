"use client";

import * as React from "react";
import {
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  Trash2Icon,
} from "lucide-react";
import { useAllCategories, useSettings } from "@/hooks/use-db";
import { deleteTransaction } from "@/lib/actions";
import { formatDayHeading, formatMoney, round2 } from "@/lib/format";
import type { Transaction } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DayGroup {
  date: string;
  items: Transaction[];
}

function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const transaction of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === transaction.date) last.items.push(transaction);
    else groups.push({ date: transaction.date, items: [transaction] });
  }
  return groups;
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const settings = useSettings();
  const categories = useAllCategories();
  const openEditDialog = useAppStore((state) => state.openEditDialog);
  const openCreateDialog = useAppStore((state) => state.openCreateDialog);
  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const categoryById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const groups = React.useMemo(() => groupByDay(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed py-14 text-center">
        <ReceiptIcon className="size-8 text-muted-foreground" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">No transactions found</p>
          <p className="text-sm text-muted-foreground">
            Add one, or adjust your filters.
          </p>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          <PlusIcon data-icon="inline-start" />
          Add transaction
        </Button>
      </div>
    );
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="grid gap-5">
        {groups.map((group) => {
          const dayExpense = round2(
            group.items
              .filter((item) => item.type === "expense")
              .reduce((total, item) => total + item.amount, 0),
          );
          return (
            <section key={group.date} className="grid gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {formatDayHeading(group.date)}
                </h2>
                {dayExpense > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatMoney(dayExpense, settings.currency)} spent
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border bg-card">
                {group.items.map((transaction, index) => {
                  const category = categoryById.get(transaction.categoryId);
                  const isIncome = transaction.type === "income";
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        index > 0 ? "border-t" : ""
                      }`}
                    >
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
                        style={{
                          backgroundColor: `${category?.color ?? "#78716c"}22`,
                        }}
                      >
                        {category?.icon ?? "📝"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {category?.name ?? "Uncategorized"}
                        </p>
                        {transaction.note && (
                          <p className="truncate text-xs text-muted-foreground">
                            {transaction.note}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-sm font-medium tabular-nums ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatMoney(transaction.amount, settings.currency)}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Transaction actions"
                            />
                          }
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                            <PencilIcon />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDelete(transaction)}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              {pendingDelete
                ? formatMoney(pendingDelete.amount, settings.currency)
                : ""}{" "}
              from your ledger. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
