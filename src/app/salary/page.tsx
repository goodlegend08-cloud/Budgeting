"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { localTodayISO } from "@/lib/format";
import { nextPayday } from "@/lib/salary";
import { useSalaryRecords } from "@/hooks/use-db";
import type { SalaryRecord } from "@/lib/schemas";
import { PageHeader } from "@/components/page-header";
import { SalaryForm } from "@/components/salary/salary-form";
import { SalaryList } from "@/components/salary/salary-list";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

let cache: { day: string; payday: { date: string; days: number } | null } = {
  day: "",
  payday: null,
};

function paydaySnapshot(): { date: string; days: number } | null {
  const today = localTodayISO();
  if (cache.day !== today) cache = { day: today, payday: nextPayday(today) };
  return cache.payday;
}

export default function SalaryPage() {
  const records = useSalaryRecords();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SalaryRecord | null>(null);
  const payday = React.useSyncExternalStore(subscribe, paydaySnapshot, () => null);

  function handleCreate() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(record: SalaryRecord) {
    setEditing(record);
    setOpen(true);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Salary"
        description="Your payslip breakdown — gross, additions, deductions, net"
      >
        {payday && (
          <span
            data-testid="next-payday"
            className="rounded-full border bg-muted/60 px-3 py-1.5 text-sm"
          >
            Next payday{" "}
            <span className="font-semibold">
              {format(parseISO(payday.date), "d MMM")}
            </span>
            <span className="text-muted-foreground">
              {payday.days === 0
                ? " · today"
                : ` · in ${payday.days} day${payday.days === 1 ? "" : "s"}`}
            </span>
          </span>
        )}
        <Button type="button" onClick={handleCreate}>
          <PlusIcon data-icon="inline-start" />
          New salary record
        </Button>
      </PageHeader>

      <SalaryList records={records} onEdit={handleEdit} onCreate={handleCreate} />

      <SalaryForm open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
