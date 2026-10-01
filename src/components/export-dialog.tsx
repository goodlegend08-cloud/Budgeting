"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useAllCategories,
  useBudgets,
  useRecurring,
  useSalaryRecords,
  useSettings,
  useTransactions,
} from "@/hooks/use-db";
import { exportMonthToExcel } from "@/lib/export";
import { localTodayISO, monthOf } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExportButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <DownloadIcon data-icon="inline-start" />
        Export
      </Button>
      <ExportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settings = useSettings();
  const transactions = useTransactions();
  const categories = useAllCategories();
  const salary = useSalaryRecords();
  const recurring = useRecurring();
  const [month, setMonth] = React.useState(() => monthOf(localTodayISO()));
  const budgets = useBudgets(month);
  const [busy, setBusy] = React.useState(false);

  if (!open) return null;

  async function handleDownload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      toast.error("Choose a month and year first");
      return;
    }
    setBusy(true);
    try {
      const file = await exportMonthToExcel({
        month,
        currency: settings.currency,
        categories,
        transactions,
        budgets,
        salary,
        recurring,
      });
      toast.success(`Downloaded ${file}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not export that month",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>
            Download one month as an .xlsx workbook — summary, transactions, budgets,
            salary, categories and recurring items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDownload} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="export-month">Month &amp; year</Label>
            <Input
              id="export-month"
              data-testid="export-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <DownloadIcon data-icon="inline-start" />
              {busy ? "Preparing…" : "Download .xlsx"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
