"use client";

import { useCallback, useMemo } from "react";
import { useResearchStore } from "@/stores/research.store";
import type { Thesis, ThesisAssumption } from "@/types/research";

export function useTheses(ticker: string) {
  const theses = useResearchStore((s) => s.theses);
  return useMemo(
    () => theses.filter((t) => t.ticker.toUpperCase() === ticker.toUpperCase()),
    [theses, ticker]
  );
}

export function useCreateThesis() {
  const addThesis = useResearchStore((s) => s.addThesis);

  return useCallback(
    (data: {
      ticker: string;
      title: string;
      description: string;
      assumptions: string[];
    }) => {
      const now = new Date().toISOString();
      const thesis: Thesis = {
        id: crypto.randomUUID(),
        ticker: data.ticker.toUpperCase(),
        title: data.title,
        description: data.description,
        assumptions: data.assumptions.map(
          (desc): ThesisAssumption => ({
            id: crypto.randomUUID(),
            description: desc,
            status: "holding",
            lastChecked: now,
          })
        ),
        status: "active",
        health: "green",
        createdAt: now,
        updatedAt: now,
      };
      addThesis(thesis);
      return thesis;
    },
    [addThesis]
  );
}

export function useUpdateThesis() {
  const updateThesis = useResearchStore((s) => s.updateThesis);

  return useCallback(
    (id: string, updates: Partial<Thesis>) => {
      updateThesis(id, updates);
    },
    [updateThesis]
  );
}
