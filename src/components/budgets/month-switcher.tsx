"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { localTodayISO, formatMonth, monthOf } from "@/lib/format";
import { isCurrentMonth, shiftMonth } from "@/lib/budgets";
import { Button } from "@/components/ui/button";

interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeftIcon />
      </Button>
      <span className="w-36 text-center text-sm font-medium">{formatMonth(month)}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Next month"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRightIcon />
      </Button>
      {!isCurrentMonth(month) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(monthOf(localTodayISO()))}
        >
          Today
        </Button>
      )}
    </div>
  );
}
