"use client";

/**
 * Personal Alpha Engine — React Query Hooks
 *
 * Data fetching hooks following existing useMarketData / useDailyEdge patterns.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Trade,
  TradeCreateInput,
  TradeCloseInput,
  EdgeSummary,
  RecommendationItem,
  RecommendationRun,
  PatternStats,
  WeeklyAlphaReport,
} from "@/types/alpha-engine";

/* ═══════════════════════════════════════════════════════
   EDGE SUMMARY
   ═══════════════════════════════════════════════════════ */

export function useEdgeSummary() {
  return useQuery<EdgeSummary>({
    queryKey: ["alpha", "edge"],
    queryFn: () => fetch("/api/alpha/edge").then(r => r.json()),
    staleTime: 60 * 1000,
  });
}

/* ═══════════════════════════════════════════════════════
   PATTERN STATS
   ═══════════════════════════════════════════════════════ */

export function usePatternStats(groupType?: string) {
  const params = new URLSearchParams();
  if (groupType) params.set("groupType", groupType);

  return useQuery<{ patterns: PatternStats[]; total: number }>({
    queryKey: ["alpha", "patterns", groupType ?? "all"],
    queryFn: () => fetch(`/api/alpha/edge/patterns?${params}`).then(r => r.json()),
    staleTime: 60 * 1000,
  });
}

/* ═══════════════════════════════════════════════════════
   TRADES
   ═══════════════════════════════════════════════════════ */

export function useTrades(filters?: {
  status?: string;
  symbol?: string;
  strategy?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.symbol) params.set("symbol", filters.symbol);
  if (filters?.strategy) params.set("strategy", filters.strategy);
  if (filters?.limit) params.set("limit", String(filters.limit));

  return useQuery<{ trades: Trade[]; total: number }>({
    queryKey: ["alpha", "trades", filters],
    queryFn: () => fetch(`/api/alpha/trades?${params}`).then(r => r.json()),
    staleTime: 30 * 1000,
  });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TradeCreateInput) =>
      fetch("/api/alpha/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.json() as Promise<Trade>;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alpha"] });
    },
  });
}

export function useCloseTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tradeId, ...input }: TradeCloseInput & { tradeId: string }) =>
      fetch(`/api/alpha/trades/${tradeId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.json() as Promise<Trade>;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alpha"] });
    },
  });
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATIONS
   ═══════════════════════════════════════════════════════ */

export function useRecommendations() {
  return useQuery<{
    items: RecommendationItem[];
    run: RecommendationRun | null;
    totalCount: number;
  }>({
    queryKey: ["alpha", "recommendations"],
    queryFn: () => fetch("/api/alpha/recommendations").then(r => r.json()),
    staleTime: 60 * 1000,
  });
}

export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidates?: unknown[]) =>
      fetch("/api/alpha/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates }),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alpha", "recommendations"] });
      qc.invalidateQueries({ queryKey: ["alpha", "edge"] });
    },
  });
}

export function useRecommendationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      fetch(`/api/alpha/recommendations/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.json() as Promise<RecommendationItem>;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alpha", "recommendations"] });
    },
  });
}

/* ═══════════════════════════════════════════════════════
   WEEKLY REPORT
   ═══════════════════════════════════════════════════════ */

export function useWeeklyReport() {
  return useQuery<{
    latest: WeeklyAlphaReport | null;
    history: WeeklyAlphaReport[];
  }>({
    queryKey: ["alpha", "weekly-report"],
    queryFn: () => fetch("/api/alpha/weekly-report").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenerateWeeklyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/alpha/weekly-report?generate=true").then(r => r.json() as Promise<WeeklyAlphaReport>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alpha", "weekly-report"] });
    },
  });
}

/* ═══════════════════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════════════════ */

export function useAdminRuns() {
  return useQuery({
    queryKey: ["alpha", "admin", "runs"],
    queryFn: () => fetch("/api/alpha/admin/runs").then(r => r.json()),
    staleTime: 30 * 1000,
  });
}

export function useAdminRunDetail(runId: string) {
  return useQuery({
    queryKey: ["alpha", "admin", "runs", runId],
    queryFn: () => fetch(`/api/alpha/admin/runs/${runId}`).then(r => r.json()),
    enabled: !!runId,
    staleTime: 30 * 1000,
  });
}
