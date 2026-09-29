"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useCategories } from "@/hooks/use-db";
import { useAppStore, type TypeFilter } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_CATEGORIES = "__all__";

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
];

export function TransactionFilters() {
  const filters = useAppStore((state) => state.filters);
  const setTypeFilter = useAppStore((state) => state.setTypeFilter);
  const setCategoryFilter = useAppStore((state) => state.setCategoryFilter);
  const setQuery = useAppStore((state) => state.setQuery);
  const resetFilters = useAppStore((state) => state.resetFilters);

  const categories = useCategories();
  const hasActiveFilters =
    filters.type !== "all" || filters.categoryId !== null || filters.query !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {typeFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTypeFilter(option.value)}
            aria-pressed={filters.type === option.value}
            className={`h-7 rounded-md px-2.5 text-sm font-medium transition-colors ${
              filters.type === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Select
        value={filters.categoryId ?? ALL_CATEGORIES}
        onValueChange={(value) =>
          setCategoryFilter(value === ALL_CATEGORIES ? null : value)
        }
        items={[
          { value: ALL_CATEGORIES, label: "All categories" },
          ...categories.map((category) => ({
            value: category.id,
            label: `${category.icon} ${category.name}`,
          })),
        ]}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.icon} {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-44 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search notes…"
          value={filters.query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {hasActiveFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
          <XIcon data-icon="inline-start" />
          Clear
        </Button>
      )}
    </div>
  );
}
