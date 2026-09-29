"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { useSalaryRecords } from "@/hooks/use-db";
import type { SalaryRecord } from "@/lib/schemas";
import { PageHeader } from "@/components/page-header";
import { SalaryForm } from "@/components/salary/salary-form";
import { SalaryList } from "@/components/salary/salary-list";
import { Button } from "@/components/ui/button";

export default function SalaryPage() {
  const records = useSalaryRecords();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SalaryRecord | null>(null);

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
