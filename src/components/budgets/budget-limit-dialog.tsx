"use client";

import * as React from "react";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { setBudgetOverride } from "@/lib/actions";
import { formatMonth, formatMoney } from "@/lib/format";
import { budgetFormSchema, type Category } from "@/lib/schemas";
import { useSettings } from "@/hooks/use-db";
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

export interface BudgetLimitTarget {
  category: Category;
  month: string;
  currentLimit: number | null;
  hasOverride: boolean;
}

interface BudgetLimitDialogProps {
  target: BudgetLimitTarget | null;
  onClose: () => void;
}

export function BudgetLimitDialog({ target, onClose }: BudgetLimitDialogProps) {
  if (!target) return null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <FormBody
          key={`${target.month}:${target.category.id}`}
          target={target}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  target,
  onClose,
}: {
  target: BudgetLimitTarget;
  onClose: () => void;
}) {
  const settings = useSettings();
  const { category, month, currentLimit, hasOverride } = target;
  const [limit, setLimit] = React.useState(
    currentLimit === null ? "" : String(currentLimit),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const defaultLimit = category.monthlyLimit;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = budgetFormSchema.safeParse({ limit });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0])] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await setBudgetOverride(month, category.id, result.data.limit);
      toast.success(`Limit saved for ${formatMonth(month)}`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save limit");
      setSaving(false);
    }
  }

  async function revertToDefault() {
    setSaving(true);
    try {
      await setBudgetOverride(month, category.id, null);
      toast.success("Reverted to the category default");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revert limit");
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {category.icon} {category.name}
        </DialogTitle>
        <DialogDescription>
          Budget for {formatMonth(month)}. Category default is{" "}
          {defaultLimit === null
            ? "no limit"
            : `${formatMoney(defaultLimit, settings.currency)}/month`}
          .
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="budget-limit">Monthly limit</Label>
          <Input
            id="budget-limit"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            aria-invalid={Boolean(errors.limit)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Applies to {formatMonth(month)} only — other months keep their own limits.
          </p>
          {errors.limit && <p className="text-xs text-destructive">{errors.limit}</p>}
        </div>

        <DialogFooter className="gap-2">
          {hasOverride && (
            <Button
              type="button"
              variant="ghost"
              onClick={revertToDefault}
              disabled={saving}
            >
              Use category default
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
