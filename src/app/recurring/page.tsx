"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { useRecurring } from "@/hooks/use-db";
import type { Recurring } from "@/lib/schemas";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RecurringForm } from "@/components/recurring/recurring-form";
import { RecurringList } from "@/components/recurring/recurring-list";

export default function RecurringPage() {
  const items = useRecurring();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Recurring | null>(null);

  function handleCreate() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(item: Recurring) {
    setEditing(item);
    setOpen(true);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Recurring"
        description="Bills, subscriptions and income that repeat"
      >
        <Button type="button" onClick={handleCreate}>
          <PlusIcon data-icon="inline-start" />
          New recurring item
        </Button>
      </PageHeader>

      <RecurringList items={items} onEdit={handleEdit} onCreate={handleCreate} />

      <RecurringForm open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
