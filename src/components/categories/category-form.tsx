"use client";

import * as React from "react";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { saveCategory } from "@/lib/actions";
import { formatMoney } from "@/lib/format";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/palette";
import { categoryFormSchema, type Category, type TransactionType } from "@/lib/schemas";
import { useSettings } from "@/hooks/use-db";
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

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

interface CategoryFormProps {
  open: boolean;
  editing: Category | null;
  onClose: () => void;
}

export function CategoryForm({ open, editing, onClose }: CategoryFormProps) {
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
  editing: Category | null;
  onClose: () => void;
}) {
  const settings = useSettings();
  const [name, setName] = React.useState(editing?.name ?? "");
  const [type, setType] = React.useState<TransactionType>(editing?.type ?? "expense");
  const [icon, setIcon] = React.useState(editing?.icon ?? CATEGORY_ICONS[0]);
  const [color, setColor] = React.useState(editing?.color ?? CATEGORY_COLORS[0]);
  const [limit, setLimit] = React.useState(
    editing?.monthlyLimit == null ? "" : String(editing.monthlyLimit),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const isEditing = editing !== null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = categoryFormSchema.safeParse({
      name,
      type,
      icon,
      color,
      monthlyLimit: limit,
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
      await saveCategory(result.data, editing?.id);
      toast.success(isEditing ? "Category updated" : "Category created");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save category");
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit category" : "New category"}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
            name="name"
            placeholder="e.g. Groceries"
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
                onClick={() => setType(option.value)}
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
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_ICONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(option)}
                aria-label={`Icon ${option}`}
                aria-pressed={icon === option}
                className={`flex size-8 items-center justify-center rounded-md border text-base transition-colors ${
                  icon === option
                    ? "border-ring bg-muted ring-3 ring-ring/50"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <FieldError message={errors.icon} />
        </div>

        <div className="grid gap-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Color ${option}`}
                aria-pressed={color === option}
                style={{ backgroundColor: option }}
                className={`size-7 rounded-full border transition-transform ${
                  color === option
                    ? "border-ring ring-3 ring-ring/50"
                    : "border-foreground/10 hover:scale-110"
                }`}
              />
            ))}
          </div>
          <FieldError message={errors.color} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category-limit">Monthly limit</Label>
          <Input
            id="category-limit"
            name="monthlyLimit"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="No limit"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            aria-invalid={Boolean(errors.monthlyLimit)}
          />
          <p className="text-xs text-muted-foreground">
            {limit.trim() === ""
              ? "Leave empty to track spending without a cap."
              : `Spending cap of ${formatMoney(Number(limit) || 0, settings.currency)} per month.`}
          </p>
          <FieldError message={errors.monthlyLimit} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create category"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
