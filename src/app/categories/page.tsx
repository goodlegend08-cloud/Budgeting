"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { useAllCategories } from "@/hooks/use-db";
import type { Category } from "@/lib/schemas";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/categories/category-form";
import { CategoryGrid } from "@/components/categories/category-grid";

function sortActiveFirst(list: Category[]): Category[] {
  return [...list].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name),
  );
}

export default function CategoriesPage() {
  const categories = useAllCategories();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);

  const expenses = sortActiveFirst(
    categories.filter((category) => category.type === "expense"),
  );
  const incomes = sortActiveFirst(
    categories.filter((category) => category.type === "income"),
  );

  function handleCreate() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(category: Category) {
    setEditing(category);
    setOpen(true);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Categories"
        description="Organise spending and set monthly limits"
      >
        <Button type="button" onClick={handleCreate}>
          <PlusIcon data-icon="inline-start" />
          New category
        </Button>
      </PageHeader>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Expense categories
        </h2>
        <CategoryGrid
          categories={expenses}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Income categories</h2>
        <CategoryGrid
          categories={incomes}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      </section>

      <CategoryForm open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
