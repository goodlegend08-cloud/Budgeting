"use client";

import * as React from "react";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { importBudgetData } from "@/lib/actions";
import { importFileSchema, type ImportFile } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatError(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const first = error.issues[0];
  if (!first) return "That file could not be read";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}

function total(data: ImportFile) {
  return (
    data.categories.length +
    data.transactions.length +
    data.budgets.length +
    data.salary.length
  );
}

export function ImportButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <UploadIcon data-icon="inline-start" />
        Import
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [parsed, setParsed] = React.useState<ImportFile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const reset = () => {
    setParsed(null);
    setError(null);
    setBusy(false);
  };

  const handleFile = async (file: File | undefined) => {
    setParsed(null);
    setError(null);
    if (!file) return;

    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setError("That file is not valid JSON");
      return;
    }

    const result = importFileSchema.safeParse(json);
    if (!result.success) {
      setError(formatError(result.error));
      return;
    }
    if (total(result.data) === 0) {
      setError("That file has nothing to import");
      return;
    }
    setParsed(result.data);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const result = await importBudgetData(parsed);
      toast.success(
        `Imported ${result.transactions} transactions, ${result.budgets} budgets, ${result.salary} salary records and ${result.categories} categories`,
      );
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import that file");
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import budget data</DialogTitle>
          <DialogDescription>
            Upload a JSON file with categories, transactions, budgets and salary
            records. Existing matching entries are skipped, nothing is overwritten.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <input
            data-testid="import-file"
            type="file"
            accept="application/json,.json"
            className="cursor-pointer rounded-lg border border-dashed border-input bg-muted/30 px-3 py-4 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          {parsed && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              {parsed.source && (
                <p className="mb-2 truncate text-muted-foreground">{parsed.source}</p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Categories</dt>
                <dd className="text-right tabular-nums">{parsed.categories.length}</dd>
                <dt className="text-muted-foreground">Transactions</dt>
                <dd className="text-right tabular-nums">
                  {parsed.transactions.length}
                </dd>
                <dt className="text-muted-foreground">Budget limits</dt>
                <dd className="text-right tabular-nums">{parsed.budgets.length}</dd>
                <dt className="text-muted-foreground">Salary records</dt>
                <dd className="text-right tabular-nums">{parsed.salary.length}</dd>
              </dl>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!parsed || busy}
            onClick={() => void handleImport()}
          >
            {busy ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
