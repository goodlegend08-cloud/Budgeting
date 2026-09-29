import { create } from "zustand";
import type { Transaction, TransactionType } from "@/lib/schemas";

export type TypeFilter = "all" | TransactionType;

interface Filters {
  type: TypeFilter;
  categoryId: string | null;
  query: string;
}

interface DialogState {
  open: boolean;
  editing: Transaction | null;
}

interface AppState {
  filters: Filters;
  setTypeFilter: (type: Filters["type"]) => void;
  setCategoryFilter: (categoryId: string | null) => void;
  setQuery: (query: string) => void;
  resetFilters: () => void;
  dialog: DialogState;
  openCreateDialog: () => void;
  openEditDialog: (transaction: Transaction) => void;
  closeDialog: () => void;
}

const emptyFilters: Filters = { type: "all", categoryId: null, query: "" };

export const useAppStore = create<AppState>((set) => ({
  filters: emptyFilters,
  setTypeFilter: (type) => set((state) => ({ filters: { ...state.filters, type } })),
  setCategoryFilter: (categoryId) =>
    set((state) => ({ filters: { ...state.filters, categoryId } })),
  setQuery: (query) => set((state) => ({ filters: { ...state.filters, query } })),
  resetFilters: () => set({ filters: emptyFilters }),
  dialog: { open: false, editing: null },
  openCreateDialog: () => set({ dialog: { open: true, editing: null } }),
  openEditDialog: (editing) => set({ dialog: { open: true, editing } }),
  closeDialog: () => set({ dialog: { open: false, editing: null } }),
}));
