import { NextResponse } from "next/server";
import {
  getGlobalDailyStats,
  getCacheStats,
  getPrecomputeStats,
  getRoutingLog,
} from "@/services/ai-cost-optimizer.service";

/**
 * GET /api/admin/ai-costs
 *
 * Admin dashboard data for AI cost monitoring.
 * Returns: daily spend, cache hit rate, model distribution,
 * routing log, and precompute status.
 *
 * In production: protect with admin auth middleware.
 */
export async function GET() {
  const daily = getGlobalDailyStats();
  const cache = getCacheStats();
  const precompute = getPrecomputeStats();
  const recentRouting = getRoutingLog(25);

  // Calculate savings estimate
  const avgCostWithoutOptimizer = 15; // $0.15 per query in cents
  const currentAvgCost = daily.avgCostPerCallCents;
  const savingsPercent = daily.totalCalls > 0
    ? Math.round((1 - currentAvgCost / avgCostWithoutOptimizer) * 100)
    : 0;

  return NextResponse.json({
    daily: {
      ...daily,
      totalCostDollars: (daily.totalCostCents / 100).toFixed(2),
      avgCostPerCallDollars: (daily.avgCostPerCallCents / 100).toFixed(4),
    },
    cache: {
      ...cache,
      hitRatePercent: (cache.hitRate * 100).toFixed(1),
    },
    precompute,
    savings: {
      estimatedSavingsPercent: savingsPercent,
      avgCostBeforeCents: avgCostWithoutOptimizer,
      avgCostAfterCents: currentAvgCost,
      targetCents: 4, // $0.04 target
    },
    recentRouting: recentRouting.map((r) => ({
      time: new Date(r.timestamp).toISOString(),
      query: r.query.slice(0, 80),
      model: r.decision.model,
      score: r.decision.complexityScore,
      reason: r.decision.reason,
      cacheHit: r.cacheHit,
      endpoint: r.endpoint,
    })),
  });
}
