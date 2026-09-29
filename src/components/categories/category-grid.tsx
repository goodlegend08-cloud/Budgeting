"use client";

import * as React from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteCategory, setCategoryArchived } from "@/lib/actions";
import { formatMoney } from "@/lib/format";
import type { Category } from "@/lib/schemas";
import { useCategoryUsage, useSettings } from "@/hooks/use-db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CategoryGridProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onCreate: () => void;
}

export function CategoryGrid({ categories, onEdit, onCreate }: CategoryGridProps) {
  const usage = useCategoryUsage();
  const settings = useSettings();
  const [pendingDelete, setPendingDelete] = React.useState<Category | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function toggleArchive(category: Category) {
    try {
      await setCategoryArchived(category.id, !category.archived);
      toast.success(category.archived ? "Category restored" : "Category archived");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update category");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteCategory(pendingDelete.id);
      toast.success("Category deleted");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category");
    } finally {
      setBusy(false);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed py-10 text-center">
        <TagsIcon className="size-8 text-muted-foreground" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">No categories here yet</p>
          <p className="text-sm text-muted-foreground">Create one to start tracking.</p>
        </div>
        <Button type="button" onClick={onCreate}>
          <PlusIcon data-icon="inline-start" />
          New category
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const count = usage.get(category.id) ?? 0;
          const inUse = count > 0;
          return (
            <Card
              key={category.id}
              className={category.archived ? "opacity-60" : undefined}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{ backgroundColor: `${category.color}22` }}
                >
                  {category.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{category.name}</p>
                    {category.archived && <Badge variant="outline">Archived</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {category.monthlyLimit === null
                      ? "No limit"
                      : `${formatMoney(category.monthlyLimit, settings.currency)}/month`}
                    {inUse && ` · ${count} ${count === 1 ? "entry" : "entries"}`}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${category.name} actions`}
                      />
                    }
                  >
                    <EllipsisIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(category)}>
                      <PencilIcon />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void toggleArchive(category)}>
                      {category.archived ? (
                        <>
                          <ArchiveRestoreIcon />
                          Restore
                        </>
                      ) : (
                        <>
                          <ArchiveIcon />
                          Archive
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={inUse}
                      onClick={() => setPendingDelete(category)}
                    >
                      <Trash2Icon />
                      {inUse ? "Delete (has entries)" : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be permanently removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
