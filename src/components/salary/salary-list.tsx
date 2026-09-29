"use client";

import * as React from "react";
import {
  BanknoteIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteSalaryRecord } from "@/lib/actions";
import { format, parseISO } from "date-fns";
import { formatMoney } from "@/lib/format";
import { netPay, sumLines } from "@/lib/salary";
import type { SalaryLine, SalaryRecord } from "@/lib/schemas";
import { useSettings } from "@/hooks/use-db";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function MoneyRow({
  label,
  amount,
  currency,
  tone = "plain",
  strong = false,
}: {
  label: string;
  amount: number;
  currency: string;
  tone?: "plain" | "positive" | "negative";
  strong?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${
        strong ? "text-sm font-medium" : "text-sm"
      }`}
    >
      <span className={strong ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${toneClass}`}>
        {tone === "positive" ? "+" : tone === "negative" ? "−" : ""}
        {formatMoney(amount, currency)}
      </span>
    </div>
  );
}

function LineList({
  lines,
  currency,
  tone,
}: {
  lines: SalaryLine[];
  currency: string;
  tone: "positive" | "negative";
}) {
  if (lines.length === 0) return null;
  return (
    <div className="grid gap-1">
      {lines.map((line, index) => (
        <MoneyRow
          key={`${line.name}-${index}`}
          label={line.name}
          amount={line.amount}
          currency={currency}
          tone={tone}
        />
      ))}
    </div>
  );
}

interface SalaryListProps {
  records: SalaryRecord[];
  onEdit: (record: SalaryRecord) => void;
  onCreate: () => void;
}

export function SalaryList({ records, onEdit, onCreate }: SalaryListProps) {
  const settings = useSettings();
  const currency = settings.currency;
  const [pendingDelete, setPendingDelete] = React.useState<SalaryRecord | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteSalaryRecord(pendingDelete.id);
      toast.success("Salary record deleted");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete record");
    } finally {
      setBusy(false);
    }
  }

  if (records.length === 0) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed py-10 text-center">
        <BanknoteIcon className="size-8 text-muted-foreground" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">No salary records yet</p>
          <p className="text-sm text-muted-foreground">
            Add your payslip — gross pay, additions, deductions and net.
          </p>
        </div>
        <Button type="button" onClick={onCreate}>
          <PlusIcon data-icon="inline-start" />
          New salary record
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {records.map((record) => {
          const allowanceTotal = sumLines(record.allowances);
          const deductionTotal = sumLines(record.deductions);
          const net = netPay(record);
          return (
            <Card key={record.id}>
              <CardContent className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{record.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(record.date), "d MMMM yyyy")}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${record.label} actions`}
                        />
                      }
                    >
                      <EllipsisIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(record)}>
                        <PencilIcon />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete(record)}
                      >
                        <Trash2Icon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid gap-1.5">
                  <MoneyRow
                    label="Gross pay"
                    amount={record.grossPay}
                    currency={currency}
                    strong
                  />

                  <LineList
                    lines={record.allowances}
                    currency={currency}
                    tone="positive"
                  />
                  {record.allowances.length > 0 && (
                    <MoneyRow
                      label="Total additions"
                      amount={allowanceTotal}
                      currency={currency}
                      tone="positive"
                    />
                  )}

                  <LineList
                    lines={record.deductions}
                    currency={currency}
                    tone="negative"
                  />
                  {record.deductions.length > 0 && (
                    <MoneyRow
                      label="Total deductions"
                      amount={deductionTotal}
                      currency={currency}
                      tone="negative"
                    />
                  )}
                </div>

                <div className="flex items-baseline justify-between border-t pt-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Net pay
                  </span>
                  <span
                    className={`text-lg font-semibold tabular-nums ${
                      net < 0 ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {formatMoney(net, currency)}
                  </span>
                </div>

                {record.note && (
                  <p className="text-xs text-muted-foreground">{record.note}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete salary record?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.label}” will be permanently removed. This cannot be
              undone.
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
