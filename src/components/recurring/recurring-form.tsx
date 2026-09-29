"use client";

import * as React from "react";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/hooks/use-db";
import { saveRecurring } from "@/lib/actions";
import { localTodayISO } from "@/lib/format";
import { FREQUENCIES, frequencyLabel } from "@/lib/recurring";
import {
  recurringFormSchema,
  type Recurring,
  type TransactionType,
} from "@/lib/schemas";
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

interface RecurringFormProps {
  open: boolean;
  editing: Recurring | null;
  onClose: () => void;
}

export function RecurringForm({ open, editing, onClose }: RecurringFormProps) {
  if (!open) return null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <FormBody key={editing?.id ?? "new"} editing={editing} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  editing,
  onClose,
}: {
  editing: Recurring | null;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(editing?.name ?? "");
  const [type, setType] = React.useState<TransactionType>(editing?.type ?? "expense");
  const [amount, setAmount] = React.useState(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = React.useState(editing?.categoryId ?? "");
  const [frequency, setFrequency] = React.useState(editing?.frequency ?? "monthly");
  const [startDate, setStartDate] = React.useState(
    editing?.startDate ?? localTodayISO(),
  );
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
    const result = recurringFormSchema.safeParse({
      name,
      type,
      amount,
      categoryId,
      frequency,
      startDate,
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
      const { created } = await saveRecurring(result.data, editing?.id);
      if (created > 0) {
        toast.success(isEditing ? "Recurring item updated" : "Recurring item created", {
          description: `${created} ${created === 1 ? "occurrence" : "occurrences"} added to your transactions`,
        });
      } else {
        toast.success(isEditing ? "Recurring item updated" : "Recurring item created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item");
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Edit recurring item" : "New recurring item"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="recurring-name">Name</Label>
          <Input
            id="recurring-name"
            name="name"
            placeholder="e.g. Rent, Netflix, Salary"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            autoFocus
          />
          <FieldError message={errors.name} />
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="recurring-amount">Amount</Label>
            <Input
              id="recurring-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(errors.amount)}
            />
            <FieldError message={errors.amount} />
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

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Repeats</Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as typeof frequency)}
              items={FREQUENCIES.map((value) => ({
                value,
                label: frequencyLabel(value),
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {frequencyLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.frequency} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recurring-start">Start date</Label>
            <Input
              id="recurring-start"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-invalid={Boolean(errors.startDate)}
            />
            <FieldError message={errors.startDate} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="recurring-note">Note</Label>
          <Textarea
            id="recurring-note"
            name="note"
            rows={2}
            placeholder="Optional detail added to each transaction"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(errors.note)}
          />
          <FieldError message={errors.note} />
        </div>

        <p className="text-xs text-muted-foreground">
          Transactions are generated automatically for every date that has passed.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create recurring item"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
