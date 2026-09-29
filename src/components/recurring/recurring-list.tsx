"use client";

import * as React from "react";
import {
  EllipsisIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RepeatIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteRecurring, setRecurringActive } from "@/lib/actions";
import { formatMoney } from "@/lib/format";
import { dueStatus, frequencyLabel } from "@/lib/recurring";
import type { Recurring } from "@/lib/schemas";
import { useAllCategories, useSettings } from "@/hooks/use-db";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const dueClasses: Record<string, string> = {
  overdue: "text-destructive",
  "due-soon": "text-amber-600 dark:text-amber-400",
  scheduled: "text-muted-foreground",
  paused: "text-muted-foreground",
};

interface RecurringListProps {
  items: Recurring[];
  onEdit: (item: Recurring) => void;
  onCreate: () => void;
}

export function RecurringList({ items, onEdit, onCreate }: RecurringListProps) {
  const categories = useAllCategories();
  const settings = useSettings();
  const [pendingDelete, setPendingDelete] = React.useState<Recurring | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function toggleActive(item: Recurring) {
    try {
      await setRecurringActive(item.id, !item.active);
      toast.success(item.active ? "Recurring item paused" : "Recurring item resumed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update item");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteRecurring(pendingDelete.id);
      toast.success("Recurring item deleted");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete item");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed py-10 text-center">
        <RepeatIcon className="size-8 text-muted-foreground" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">No recurring items yet</p>
          <p className="text-sm text-muted-foreground">
            Set up rent, subscriptions or salary to log themselves.
          </p>
        </div>
        <Button type="button" onClick={onCreate}>
          <PlusIcon data-icon="inline-start" />
          New recurring item
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        {items.map((item, index) => {
          const category = categories.find((entry) => entry.id === item.categoryId);
          const status = dueStatus(item);
          const isIncome = item.type === "income";
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 ${
                index > 0 ? "border-t" : ""
              } ${item.active ? "" : "opacity-70"}`}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: `${category?.color ?? "#78716c"}22` }}
              >
                {category?.icon ?? "🔁"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  {!item.active && <Badge variant="outline">Paused</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {category?.name ?? "Uncategorized"} · {frequencyLabel(item.frequency)}{" "}
                  · <span className={dueClasses[status.kind]}>{status.label}</span>
                </p>
              </div>

              <span
                className={`text-sm font-medium tabular-nums ${
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {isIncome ? "+" : "−"}
                {formatMoney(item.amount, settings.currency)}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${item.name} actions`}
                    />
                  }
                >
                  <EllipsisIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void toggleActive(item)}>
                    {item.active ? (
                      <>
                        <PauseIcon />
                        Pause
                      </>
                    ) : (
                      <>
                        <PlayIcon />
                        Resume
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingDelete(item)}
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

      <p className="text-xs text-muted-foreground">
        Past-due occurrences are added as transactions automatically the next time the
        app opens. Deleting an item keeps the transactions it already created.
      </p>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring item?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will stop repeating. Transactions it already
              created are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
