"use client";

import { PencilIcon } from "lucide-react";
import { formatMoney, round2 } from "@/lib/format";
import type { Category } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface BudgetRowData {
  category: Category;
  spent: number;
  limit: number | null;
  hasOverride: boolean;
}

interface BudgetRowProps {
  row: BudgetRowData;
  currency: string;
  onEdit: (row: BudgetRowData) => void;
}

export function BudgetRow({ row, currency, onEdit }: BudgetRowProps) {
  const { category, spent, limit, hasOverride } = row;
  const hasLimit = limit !== null;
  const over = hasLimit && spent > limit;
  const remaining = hasLimit ? round2(limit - spent) : null;
  const percent = hasLimit && limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

  return (
    <Card>
      <CardContent className="grid gap-2.5 p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `${category.color}22` }}
          >
            {category.icon}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-medium">{category.name}</p>
              {hasOverride && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                  custom
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasLimit
                ? `${formatMoney(spent, currency)} of ${formatMoney(limit, currency)}`
                : `${formatMoney(spent, currency)} spent · no limit`}
            </p>
          </div>

          <div className="text-right">
            {hasLimit ? (
              <p
                className={`text-sm font-semibold tabular-nums ${
                  over
                    ? "text-destructive"
                    : remaining === 0
                      ? "text-foreground"
                      : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {over
                  ? `-${formatMoney(Math.abs(remaining ?? 0), currency)}`
                  : formatMoney(remaining ?? 0, currency)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            <p className="text-xs text-muted-foreground">
              {hasLimit ? (over ? "over" : "left") : ""}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Set limit for ${category.name}`}
            onClick={() => onEdit(row)}
          >
            <PencilIcon />
          </Button>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${over ? "" : "transition-all"}`}
            style={{
              width: `${hasLimit ? percent : 0}%`,
              backgroundColor: over ? "var(--color-destructive)" : category.color,
            }}
          />
        </div>

        {over && (
          <p className="text-xs text-destructive">
            Over by {formatMoney(Math.abs(remaining ?? 0), currency)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
