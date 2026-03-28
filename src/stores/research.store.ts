import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Thesis } from "@/types/research";

interface ResearchState {
  theses: Thesis[];
  addThesis: (thesis: Thesis) => void;
  updateThesis: (id: string, updates: Partial<Thesis>) => void;
  removeThesis: (id: string) => void;
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      theses: [],

      addThesis: (thesis) =>
        set((state) => ({
          theses: [...state.theses, thesis],
        })),

      updateThesis: (id, updates) =>
        set((state) => ({
          theses: state.theses.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),

      removeThesis: (id) =>
        set((state) => ({
          theses: state.theses.filter((t) => t.id !== id),
        })),
    }),
    { name: "obsidian-research" }
  )
);
