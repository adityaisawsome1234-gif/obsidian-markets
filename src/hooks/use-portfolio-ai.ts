"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import type { PortfolioHolding } from "@/types/portfolio";
import type { PortfolioContext, PortfolioAlert } from "@/services/portfolio-ai.service";

function encodeHoldings(holdings: PortfolioHolding[]): string {
  return btoa(JSON.stringify(holdings));
}

export function usePortfolioContext(holdings: PortfolioHolding[]) {
  return useQuery<PortfolioContext>({
    queryKey: ["portfolio-context", holdings.map((h) => h.ticker).join(",")],
    queryFn: async () => {
      const res = await fetch(
        `/api/ai/portfolio-context?holdings=${encodeHoldings(holdings)}`
      );
      if (!res.ok) throw new Error("Failed to fetch portfolio context");
      return res.json();
    },
    enabled: holdings.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

interface ScanResponse {
  alerts: (PortfolioAlert & { narrative: string | null })[];
  scannedAt: string;
  context?: {
    totalValue: number;
    totalUnrealizedPL: number;
    portfolioBeta: number;
    var95: number;
  };
  message?: string;
}

export function usePortfolioScan(holdings: PortfolioHolding[]) {
  return useMutation<ScanResponse>({
    mutationKey: ["portfolio-scan"],
    mutationFn: async () => {
      const res = await fetch("/api/ai/portfolio-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings }),
      });
      if (!res.ok) throw new Error("Scan failed");
      return res.json();
    },
  });
}
