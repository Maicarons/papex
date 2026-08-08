"use client";

import { create } from "zustand";

interface PaperFiltersState {
  query: string;
  category: string;
  sort: "new" | "updated";
  setQuery: (q: string) => void;
  setCategory: (c: string) => void;
  setSort: (s: "new" | "updated") => void;
  reset: () => void;
}

/** Client-side filter state for the papers browse page (synced to URL on apply). */
export const usePaperFilters = create<PaperFiltersState>((set) => ({
  query: "",
  category: "",
  sort: "new",
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ query: "", category: "", sort: "new" }),
}));
