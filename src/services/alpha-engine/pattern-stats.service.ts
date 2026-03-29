/**
 * Personal Alpha Engine — Pattern Stats Service
 *
 * Computes user-specific performance statistics grouped by:
 * strategy, sector, market cap, holding period, and signal type.
 *
 * Produces behavioral insights and edge snapshots.
 */

import type {
  Trade,
  PatternStats,
  BehavioralInsight,
  UserEdgeSnapshot,
  HoldingPeriodBucket,
} from "@/types/alpha-engine";
import { RECENT_TRADE_WINDOW, SETUP_QUALITY, CONFIDENCE_THRESHOLDS } from "./config";
import { getHoldingPeriodBucket } from "./trade.service";

/* ═══════════════════════════════════════════════════════
   PATTERN STATS COMPUTATION
   ═══════════════════════════════════════════════════════ */

/**
 * Compute all pattern stats for a user from their closed trades.
 * Groups by every relevant dimension and computes aggregates.
 */
export function computeAllPatternStats(closedTrades: Trade[]): PatternStats[] {
  const stats: PatternStats[] = [];

  // Group by strategy tag
  const byStrategy = groupBy(closedTrades, t => t.strategyTag);
  for (const [value, trades] of byStrategy) {
    stats.push(computeGroupStats("strategy_tag", value, trades));
  }

  // Group by sector
  const bySector = groupBy(closedTrades.filter(t => t.sector), t => t.sector!);
  for (const [value, trades] of bySector) {
    stats.push(computeGroupStats("sector", value, trades));
  }

  // Group by market cap
  const byCap = groupBy(closedTrades.filter(t => t.marketCapBucket), t => t.marketCapBucket!);
  for (const [value, trades] of byCap) {
    stats.push(computeGroupStats("market_cap_bucket", value, trades));
  }

  // Group by holding period bucket
  const byHold = groupBy(
    closedTrades.filter(t => t.holdingPeriodDays != null),
    t => getHoldingPeriodBucket(t.holdingPeriodDays!),
  );
  for (const [value, trades] of byHold) {
    stats.push(computeGroupStats("holding_period_bucket", value, trades));
  }

  return stats;
}

function computeGroupStats(
  groupType: PatternStats["groupType"],
  groupValue: string,
  trades: Trade[],
): PatternStats {
  const returns = trades
    .filter(t => t.pnlPercent != null)
    .map(t => t.pnlPercent!);

  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);

  const winRate = returns.length > 0 ? wins.length / returns.length : 0;
  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const medianReturn = median(returns);
  const maxDrawdown = returns.length > 0 ? Math.min(...returns) : 0;
  const bestReturn = returns.length > 0 ? Math.max(...returns) : 0;

  const grossWins = wins.reduce((s, r) => s + r, 0);
  const grossLosses = Math.abs(losses.reduce((s, r) => s + r, 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0;

  const holdDays = trades
    .filter(t => t.holdingPeriodDays != null)
    .map(t => t.holdingPeriodDays!);
  const avgHoldDays = holdDays.length > 0
    ? holdDays.reduce((s, d) => s + d, 0) / holdDays.length
    : 0;

  const totalPnl = trades
    .filter(t => t.pnlAbsolute != null)
    .reduce((s, t) => s + t.pnlAbsolute!, 0);

  // Recent trend: compare last N trades to overall
  const recentTrend = computeRecentTrend(returns);

  // Confidence based on sample size
  const confidenceScore = 1 - Math.exp(-0.15 * returns.length);

  return {
    groupKey: `${groupType}:${groupValue}`,
    groupType,
    groupValue,
    winRate: round2(winRate),
    avgReturn: round2(avgReturn),
    medianReturn: round2(medianReturn),
    maxDrawdown: round2(maxDrawdown),
    bestReturn: round2(bestReturn),
    sampleSize: returns.length,
    avgHoldDays: round2(avgHoldDays),
    totalPnl: round2(totalPnl),
    profitFactor: round2(profitFactor),
    recentTrend,
    confidenceScore: round2(confidenceScore),
    lastUpdated: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   BEHAVIORAL INSIGHTS
   ═══════════════════════════════════════════════════════ */

export function generateInsights(
  patternStats: PatternStats[],
  closedTrades: Trade[],
): BehavioralInsight[] {
  const insights: BehavioralInsight[] = [];

  // Best setup
  const bestSetup = patternStats
    .filter(p => p.groupType === "strategy_tag" && p.sampleSize >= 3)
    .sort((a, b) => b.avgReturn - a.avgReturn)[0];

  if (bestSetup && bestSetup.winRate >= SETUP_QUALITY.decent) {
    insights.push({
      id: `insight_best_${bestSetup.groupValue}`,
      category: "strength",
      message: `You perform best on ${formatLabel(bestSetup.groupValue)} setups — ${(bestSetup.winRate * 100).toFixed(0)}% win rate with ${bestSetup.avgReturn.toFixed(1)}% avg return across ${bestSetup.sampleSize} trades.`,
      evidence: `Win rate: ${(bestSetup.winRate * 100).toFixed(0)}%, Avg return: ${bestSetup.avgReturn.toFixed(1)}%, Sample: ${bestSetup.sampleSize}`,
      confidence: bestSetup.sampleSize >= CONFIDENCE_THRESHOLDS.high ? "high" : "medium",
      relatedPattern: bestSetup.groupKey,
    });
  }

  // Worst setup
  const worstSetup = patternStats
    .filter(p => p.groupType === "strategy_tag" && p.sampleSize >= 3)
    .sort((a, b) => a.avgReturn - b.avgReturn)[0];

  if (worstSetup && worstSetup.winRate < SETUP_QUALITY.weak) {
    insights.push({
      id: `insight_worst_${worstSetup.groupValue}`,
      category: "weakness",
      message: `You underperform on ${formatLabel(worstSetup.groupValue)} trades — ${(worstSetup.winRate * 100).toFixed(0)}% win rate with ${worstSetup.avgReturn.toFixed(1)}% avg return. Consider reducing exposure.`,
      evidence: `Win rate: ${(worstSetup.winRate * 100).toFixed(0)}%, Avg return: ${worstSetup.avgReturn.toFixed(1)}%, Sample: ${worstSetup.sampleSize}`,
      confidence: worstSetup.sampleSize >= CONFIDENCE_THRESHOLDS.high ? "high" : "medium",
      relatedPattern: worstSetup.groupKey,
    });
  }

  // Best sector
  const bestSector = patternStats
    .filter(p => p.groupType === "sector" && p.sampleSize >= 3)
    .sort((a, b) => b.avgReturn - a.avgReturn)[0];

  if (bestSector && bestSector.winRate >= SETUP_QUALITY.decent) {
    insights.push({
      id: `insight_sector_${bestSector.groupValue}`,
      category: "strength",
      message: `Your ${bestSector.groupValue} trades show an edge — ${(bestSector.winRate * 100).toFixed(0)}% win rate across ${bestSector.sampleSize} trades.`,
      evidence: `Sector: ${bestSector.groupValue}, Win rate: ${(bestSector.winRate * 100).toFixed(0)}%, Avg return: ${bestSector.avgReturn.toFixed(1)}%`,
      confidence: bestSector.sampleSize >= CONFIDENCE_THRESHOLDS.medium ? "medium" : "low",
      relatedPattern: bestSector.groupKey,
    });
  }

  // Holding period insight
  const holdStats = patternStats
    .filter(p => p.groupType === "holding_period_bucket" && p.sampleSize >= 3)
    .sort((a, b) => b.avgReturn - a.avgReturn);

  if (holdStats.length >= 2) {
    const best = holdStats[0];
    const worst = holdStats[holdStats.length - 1];
    if (best.avgReturn > worst.avgReturn + 1) {
      insights.push({
        id: `insight_hold_${best.groupValue}`,
        category: "opportunity",
        message: `Your results improve when holding ${formatHoldLabel(best.groupValue)} versus ${formatHoldLabel(worst.groupValue)} exits.`,
        evidence: `${formatHoldLabel(best.groupValue)}: ${best.avgReturn.toFixed(1)}% avg vs ${formatHoldLabel(worst.groupValue)}: ${worst.avgReturn.toFixed(1)}% avg`,
        confidence: best.sampleSize >= CONFIDENCE_THRESHOLDS.medium ? "medium" : "low",
        relatedPattern: best.groupKey,
      });
    }
  }

  // Recent losing streak warning
  const recentTrades = closedTrades
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime())
    .slice(0, 5);
  const recentLosses = recentTrades.filter(t => t.pnlPercent != null && t.pnlPercent < 0);
  if (recentLosses.length >= 4) {
    insights.push({
      id: "insight_losing_streak",
      category: "warning",
      message: `${recentLosses.length} of your last 5 trades were losses. Consider pausing and reviewing your approach.`,
      evidence: `Last 5 trades: ${recentLosses.length} losses`,
      confidence: "high",
      relatedPattern: null,
    });
  }

  // Market cap preference
  const capStats = patternStats
    .filter(p => p.groupType === "market_cap_bucket" && p.sampleSize >= 3)
    .sort((a, b) => b.avgReturn - a.avgReturn);

  if (capStats.length >= 2) {
    const bestCap = capStats[0];
    const worstCap = capStats[capStats.length - 1];
    if (bestCap.winRate > worstCap.winRate + 0.15) {
      insights.push({
        id: `insight_cap_${bestCap.groupValue}`,
        category: "opportunity",
        message: `You perform significantly better in ${bestCap.groupValue}-cap stocks (${(bestCap.winRate * 100).toFixed(0)}% win rate) vs ${worstCap.groupValue}-cap (${(worstCap.winRate * 100).toFixed(0)}%).`,
        evidence: `${bestCap.groupValue}: ${(bestCap.winRate * 100).toFixed(0)}% win, ${worstCap.groupValue}: ${(worstCap.winRate * 100).toFixed(0)}% win`,
        confidence: bestCap.sampleSize >= CONFIDENCE_THRESHOLDS.medium ? "medium" : "low",
        relatedPattern: bestCap.groupKey,
      });
    }
  }

  return insights;
}

/* ═══════════════════════════════════════════════════════
   EDGE SNAPSHOT
   ═══════════════════════════════════════════════════════ */

export function buildEdgeSnapshot(
  userId: string,
  allTrades: Trade[],
  patternStats: PatternStats[],
  recommendationStats: { generated: number; accepted: number; hitRate: number },
): UserEdgeSnapshot {
  const closedTrades = allTrades.filter(t => t.status === "closed");
  const returns = closedTrades
    .filter(t => t.pnlPercent != null)
    .map(t => t.pnlPercent!);

  const overallWinRate = returns.length > 0
    ? returns.filter(r => r > 0).length / returns.length
    : 0;
  const overallAvgReturn = returns.length > 0
    ? returns.reduce((s, r) => s + r, 0) / returns.length
    : 0;

  // Best/worst setups (top 3 each, strategy only)
  const strategyStats = patternStats
    .filter(p => p.groupType === "strategy_tag" && p.sampleSize >= 2);
  const bestSetups = strategyStats
    .sort((a, b) => b.avgReturn - a.avgReturn)
    .slice(0, 3);
  const worstSetups = strategyStats
    .sort((a, b) => a.avgReturn - b.avgReturn)
    .slice(0, 3);

  const insights = generateInsights(patternStats, closedTrades);

  return {
    id: `edge_${userId}_${Date.now()}`,
    userId,
    snapshotDate: new Date().toISOString(),
    overallWinRate: round2(overallWinRate),
    overallAvgReturn: round2(overallAvgReturn),
    totalTrades: allTrades.length,
    totalClosedTrades: closedTrades.length,
    bestSetups,
    worstSetups,
    recommendationHitRate: recommendationStats.hitRate,
    recommendationsAccepted: recommendationStats.accepted,
    recommendationsGenerated: recommendationStats.generated,
    behavioralInsights: insights,
    createdAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeRecentTrend(returns: number[]): "improving" | "declining" | "stable" {
  if (returns.length < RECENT_TRADE_WINDOW + 2) return "stable";

  const recent = returns.slice(-RECENT_TRADE_WINDOW);
  const recentAvg = recent.reduce((s, r) => s + r, 0) / recent.length;
  const overallAvg = returns.reduce((s, r) => s + r, 0) / returns.length;

  const diff = recentAvg - overallAvg;
  if (diff > 1.5) return "improving";
  if (diff < -1.5) return "declining";
  return "stable";
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatHoldLabel(bucket: string): string {
  const labels: Record<string, string> = {
    intraday: "intraday",
    swing_1_3d: "1–3 days",
    swing_4_7d: "4–7 days",
    position_1_4w: "1–4 weeks",
    long_term: "long-term (4+ weeks)",
  };
  return labels[bucket] ?? bucket;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
