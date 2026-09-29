"use client";

import * as React from "react";
import { SaveIcon } from "lucide-react";
import { useCategories } from "@/hooks/use-db";
import { saveTransaction } from "@/lib/actions";
import { localTodayISO } from "@/lib/format";
import {
  transactionFormSchema,
  type Transaction,
  type TransactionType,
} from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function TransactionForm() {
  const open = useAppStore((state) => state.dialog.open);
  const editing = useAppStore((state) => state.dialog.editing);
  const closeDialog = useAppStore((state) => state.closeDialog);
  const categories = useCategories();

  if (!open || categories.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <FormBody key={editing?.id ?? "new"} editing={editing} onClose={closeDialog} />
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  editing,
  onClose,
}: {
  editing: Transaction | null;
  onClose: () => void;
}) {
  const [type, setType] = React.useState<TransactionType>(editing?.type ?? "expense");
  const [amount, setAmount] = React.useState(editing ? String(editing.amount) : "");
  const [date, setDate] = React.useState(editing?.date ?? localTodayISO());
  const [categoryId, setCategoryId] = React.useState(editing?.categoryId ?? "");
  const [note, setNote] = React.useState(editing?.note ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const categories = useCategories(type);
  const isEditing = editing !== null;

  function changeType(next: TransactionType) {
    if (next === type) return;
    setType(next);
    setCategoryId("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = transactionFormSchema.safeParse({
      type,
      amount,
      date,
      categoryId,
      note,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        fieldErrors[field] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await saveTransaction(result.data, editing?.id);
      onClose();
    } catch {
      setErrors({ form: "Could not save the transaction. Try again." });
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit transaction" : "New transaction"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeType(option.value)}
                aria-pressed={type === option.value}
                className={`h-7 rounded-md text-sm font-medium transition-colors ${
                  type === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(errors.amount)}
            autoFocus
          />
          <FieldError message={errors.amount} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={Boolean(errors.date)}
            />
            <FieldError message={errors.date} />
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={categoryId || null}
              onValueChange={(value) => setCategoryId(value ?? "")}
              items={categories.map((category) => ({
                value: category.id,
                label: `${category.icon} ${category.name}`,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.categoryId} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            name="note"
            rows={2}
            placeholder="Optional note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(errors.note)}
          />
          <FieldError message={errors.note} />
        </div>

        {errors.form && <FieldError message={errors.form} />}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add transaction"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
