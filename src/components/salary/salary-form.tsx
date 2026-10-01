"use client";

import * as React from "react";
import { PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { saveSalaryRecord } from "@/lib/actions";
import { formatMoney, localTodayISO, round2 } from "@/lib/format";
import { ALLOWANCE_PRESETS, DEDUCTION_PRESETS, paydayISOsInMonth } from "@/lib/salary";
import { salaryFormSchema, type SalaryRecord } from "@/lib/schemas";
import { format, parseISO } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";

interface Line {
  name: string;
  amount: string;
}

function toLine(line: { name: string; amount: number }): Line {
  return { name: line.name, amount: String(line.amount) };
}

function lineTotal(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function LineRows({
  lines,
  onChange,
  onRemove,
  placeholder,
}: {
  lines: Line[];
  onChange: (index: number, value: Partial<Line>) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      {lines.map((line, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={line.name}
            placeholder={placeholder}
            aria-label={`${placeholder} name`}
            onChange={(event) => onChange(index, { name: event.target.value })}
          />
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            aria-label={`${placeholder} amount`}
            className="w-32 shrink-0 text-right"
            value={line.amount}
            onChange={(event) => onChange(index, { amount: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${line.name || placeholder.toLowerCase()}`}
            onClick={() => onRemove(index)}
          >
            <XIcon />
          </Button>
        </div>
      ))}
    </div>
  );
}

function PresetRow({
  presets,
  onPick,
}: {
  presets: string[];
  onPick: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onPick(preset)}
          className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          + {preset}
        </button>
      ))}
    </div>
  );
}

interface SalaryFormProps {
  open: boolean;
  editing: SalaryRecord | null;
  onClose: () => void;
}

export function SalaryForm({ open, editing, onClose }: SalaryFormProps) {
  if (!open) return null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <FormBody key={editing?.id ?? "new"} editing={editing} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  editing,
  onClose,
}: {
  editing: SalaryRecord | null;
  onClose: () => void;
}) {
  const settings = useSettings();
  const [label, setLabel] = React.useState(editing?.label ?? "");
  const [date, setDate] = React.useState(editing?.date ?? localTodayISO());
  const [grossPay, setGrossPay] = React.useState(
    editing ? String(editing.grossPay) : "",
  );
  const [allowances, setAllowances] = React.useState<Line[]>(
    editing?.allowances.map(toLine) ?? [],
  );
  const [deductions, setDeductions] = React.useState<Line[]>(
    editing?.deductions.map(toLine) ?? [],
  );
  const [note, setNote] = React.useState(editing?.note ?? "");
  const [split, setSplit] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const isEditing = editing !== null;
  const gross = Number(grossPay) || 0;
  const allowanceTotal = lineTotal(allowances);
  const deductionTotal = lineTotal(deductions);
  const net = gross + allowanceTotal - deductionTotal;
  const [firstPayday, secondPayday] = paydayISOsInMonth(date || localTodayISO());
  const netFirst = round2(net / 2);
  const netSecond = round2(net - netFirst);

  function updateLine(
    kind: "allowances" | "deductions",
    index: number,
    value: Partial<Line>,
  ) {
    const setter = kind === "allowances" ? setAllowances : setDeductions;
    setter((lines) =>
      lines.map((line, i) => (i === index ? { ...line, ...value } : line)),
    );
  }

  function removeLine(kind: "allowances" | "deductions", index: number) {
    const setter = kind === "allowances" ? setAllowances : setDeductions;
    setter((lines) => lines.filter((_, i) => i !== index));
  }

  function addLine(kind: "allowances" | "deductions", name = "") {
    const setter = kind === "allowances" ? setAllowances : setDeductions;
    setter((lines) => [...lines, { name, amount: "" }]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clean = (lines: Line[]) =>
      lines.filter((line) => line.name.trim() !== "" || line.amount.trim() !== "");

    const result = salaryFormSchema.safeParse({
      label,
      date,
      grossPay,
      allowances: clean(allowances),
      deductions: clean(deductions),
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
      await saveSalaryRecord(result.data, editing?.id, split && !isEditing);
      toast.success(
        split && !isEditing
          ? "2 salary records saved — 8th and 23rd"
          : isEditing
            ? "Salary record updated"
            : "Salary record saved",
      );
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save record");
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Edit salary record" : "New salary record"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="salary-label">Label</Label>
            <Input
              id="salary-label"
              name="label"
              placeholder="e.g. November salary"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-invalid={Boolean(errors.label)}
              autoFocus
            />
            <FieldError message={errors.label} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="salary-date">Pay date</Label>
            <Input
              id="salary-date"
              name="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={Boolean(errors.date)}
            />
            <FieldError message={errors.date} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="salary-gross">Gross pay</Label>
          <Input
            id="salary-gross"
            name="grossPay"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={grossPay}
            onChange={(event) => setGrossPay(event.target.value)}
            aria-invalid={Boolean(errors.grossPay)}
          />
          <FieldError message={errors.grossPay} />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Additions</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => addLine("allowances")}
            >
              <PlusIcon data-icon="inline-start" />
              Add line
            </Button>
          </div>
          <LineRows
            lines={allowances}
            onChange={(index, value) => updateLine("allowances", index, value)}
            onRemove={(index) => removeLine("allowances", index)}
            placeholder="Allowance"
          />
          <PresetRow
            presets={ALLOWANCE_PRESETS}
            onPick={(name) => addLine("allowances", name)}
          />
          <FieldError message={errors.allowances} />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Deductions</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => addLine("deductions")}
            >
              <PlusIcon data-icon="inline-start" />
              Add line
            </Button>
          </div>
          <LineRows
            lines={deductions}
            onChange={(index, value) => updateLine("deductions", index, value)}
            onRemove={(index) => removeLine("deductions", index)}
            placeholder="Deduction"
          />
          <PresetRow
            presets={DEDUCTION_PRESETS}
            onPick={(name) => addLine("deductions", name)}
          />
          <FieldError message={errors.deductions} />
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">
            Net pay
            {net < 0 && (
              <span className="ml-2 text-destructive">Deductions exceed pay</span>
            )}
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(net, settings.currency)}
          </span>
        </div>

        {!isEditing && (
          <div className="grid gap-2">
            <label
              htmlFor="split-paydays"
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm"
            >
              <input
                id="split-paydays"
                data-testid="split-paydays"
                type="checkbox"
                checked={split}
                onChange={(event) => setSplit(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="grid gap-0.5">
                <span className="font-medium">
                  Split into 2 paydays — 8th &amp; 23rd
                </span>
                <span className="text-xs text-muted-foreground">
                  Saves two half-pay records for this month instead of one.
                </span>
              </span>
            </label>
            {split && (
              <p className="text-xs text-muted-foreground">
                Saves {formatMoney(netFirst, settings.currency)} on{" "}
                {format(parseISO(firstPayday), "d MMM")} ·{" "}
                {formatMoney(netSecond, settings.currency)} on{" "}
                {format(parseISO(secondPayday), "d MMM")}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="salary-note">Note</Label>
          <Textarea
            id="salary-note"
            name="note"
            rows={2}
            placeholder="Optional note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(errors.note)}
          />
          <FieldError message={errors.note} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Saving…" : isEditing ? "Save changes" : "Save record"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
