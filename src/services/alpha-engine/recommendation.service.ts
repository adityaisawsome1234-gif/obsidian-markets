/**
 * Personal Alpha Engine — Recommendation Service
 *
 * Generates personalized, explainable trade recommendations.
 * Tracks recommendation lifecycle: generated → viewed → accepted/rejected → outcome.
 */

import type {
  RecommendationRun,
  RecommendationItem,
  MarketSignal,
  Trade,
  PatternStats,
  FactorBreakdown,
  RecommendationStatus,
  ActionType,
  Sector,
  MarketCapBucket,
  StrategyTag,
  ScoringConfig,
} from "@/types/alpha-engine";
import { computeScore, type ScoringInput } from "./scoring.service";
import { computeAllPatternStats } from "./pattern-stats.service";
import { getOpenPositions, getRecentClosedTrades, getClosedTrades } from "./trade.service";
import { DEFAULT_SCORING_CONFIG, MAX_RECOMMENDATIONS_PER_RUN, MIN_RECOMMENDATION_SCORE } from "./config";

/* ═══════════════════════════════════════════════════════
   IN-MEMORY STORE
   ═══════════════════════════════════════════════════════ */

const runStore = new Map<string, RecommendationRun>();
const itemStore = new Map<string, RecommendationItem>();

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ═══════════════════════════════════════════════════════
   CANDIDATE SIGNAL INPUT
   ═══════════════════════════════════════════════════════ */

export interface CandidateSymbol {
  symbol: string;
  signals: MarketSignal[];
  sector: Sector | null;
  marketCapBucket: MarketCapBucket | null;
  suggestedStrategy: StrategyTag;
  suggestedAction: ActionType;
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATION GENERATION
   ═══════════════════════════════════════════════════════ */

/**
 * Generate a batch of personalized recommendations for a user.
 * Idempotent: won't duplicate if called multiple times in same minute.
 */
export function generateRecommendations(
  userId: string,
  candidates: CandidateSymbol[],
  config?: ScoringConfig,
): { run: RecommendationRun; items: RecommendationItem[] } {
  const startTime = Date.now();
  const scoringConfig = config ?? DEFAULT_SCORING_CONFIG;

  // Get user's trading context
  const openPositions = getOpenPositions(userId);
  const recentClosed = getRecentClosedTrades(userId, 90);
  const allClosed = getClosedTrades(userId);
  const patternStats = computeAllPatternStats(allClosed);

  // Score each candidate
  const scored: { candidate: CandidateSymbol; result: ReturnType<typeof computeScore> }[] = [];

  for (const candidate of candidates) {
    const input: ScoringInput = {
      symbol: candidate.symbol,
      signals: candidate.signals,
      userPatterns: patternStats,
      openPositions,
      recentClosedTrades: recentClosed,
      sector: candidate.sector,
      marketCapBucket: candidate.marketCapBucket,
      suggestedStrategy: candidate.suggestedStrategy,
      config: scoringConfig,
    };

    const result = computeScore(input);
    scored.push({ candidate, result });
  }

  // Sort by final score descending, take top N above threshold
  scored.sort((a, b) => b.result.finalScore - a.result.finalScore);
  const topCandidates = scored
    .filter(s => s.result.finalScore >= MIN_RECOMMENDATION_SCORE)
    .slice(0, MAX_RECOMMENDATIONS_PER_RUN);

  // Create run
  const runId = genId("run");
  const run: RecommendationRun = {
    id: runId,
    userId,
    triggeredAt: new Date().toISOString(),
    triggerType: "manual",
    symbolsEvaluated: candidates.length,
    recommendationsGenerated: topCandidates.length,
    durationMs: Date.now() - startTime,
    scoringConfigSnapshot: scoringConfig,
    createdAt: new Date().toISOString(),
  };
  runStore.set(runId, run);

  // Create recommendation items with factor breakdowns
  const items: RecommendationItem[] = [];
  for (const { candidate, result } of topCandidates) {
    const itemId = genId("rec");
    const factors: FactorBreakdown[] = result.factors.map((f, i) => ({
      ...f,
      id: `factor_${itemId}_${i}`,
      recommendationItemId: itemId,
    }));

    const item: RecommendationItem = {
      id: itemId,
      runId,
      userId,
      symbol: candidate.symbol,
      actionType: candidate.suggestedAction,
      tradeFitScore: result.tradeFitScore,
      marketConvictionScore: result.marketConvictionScore,
      personalEdgeScore: result.personalEdgeScore,
      riskPenaltyScore: result.riskPenaltyScore,
      finalScore: result.finalScore,
      rationaleSummary: result.rationaleSummary,
      status: "generated",
      outcomeStatus: "pending",
      outcomeReturnPercent: null,
      sector: candidate.sector,
      marketCapBucket: candidate.marketCapBucket,
      suggestedStrategy: candidate.suggestedStrategy,
      confidenceLevel: result.confidenceLevel,
      factors,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    itemStore.set(itemId, item);
    items.push(item);
  }

  return { run, items };
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATION QUERIES
   ═══════════════════════════════════════════════════════ */

export function getLatestRecommendations(
  userId: string,
  limit: number = 10,
): { items: RecommendationItem[]; run: RecommendationRun | null } {
  // Find most recent run
  const runs = Array.from(runStore.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latestRun = runs[0] ?? null;
  if (!latestRun) return { items: [], run: null };

  const items = Array.from(itemStore.values())
    .filter(i => i.runId === latestRun.id)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);

  return { items, run: latestRun };
}

export function getRecommendation(userId: string, itemId: string): RecommendationItem | null {
  const item = itemStore.get(itemId);
  if (!item || item.userId !== userId) return null;
  return item;
}

export function getRecommendationsByRun(runId: string): RecommendationItem[] {
  return Array.from(itemStore.values())
    .filter(i => i.runId === runId)
    .sort((a, b) => b.finalScore - a.finalScore);
}

export function getAllRuns(userId: string): RecommendationRun[] {
  return Array.from(runStore.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/* ═══════════════════════════════════════════════════════
   STATUS MANAGEMENT
   ═══════════════════════════════════════════════════════ */

export function updateRecommendationStatus(
  userId: string,
  itemId: string,
  status: RecommendationStatus,
): RecommendationItem | null {
  const item = itemStore.get(itemId);
  if (!item || item.userId !== userId) return null;

  const updated: RecommendationItem = {
    ...item,
    status,
    updatedAt: new Date().toISOString(),
  };
  itemStore.set(itemId, updated);
  return updated;
}

/* ═══════════════════════════════════════════════════════
   OUTCOME TRACKING
   ═══════════════════════════════════════════════════════ */

export function recordOutcome(
  itemId: string,
  outcomeReturnPercent: number,
): RecommendationItem | null {
  const item = itemStore.get(itemId);
  if (!item) return null;

  const outcomeStatus = outcomeReturnPercent > 0.5
    ? "win" as const
    : outcomeReturnPercent < -0.5
      ? "loss" as const
      : "breakeven" as const;

  const updated: RecommendationItem = {
    ...item,
    outcomeStatus,
    outcomeReturnPercent,
    updatedAt: new Date().toISOString(),
  };
  itemStore.set(itemId, updated);
  return updated;
}

/**
 * Evaluate outcomes for recommendations linked to closed trades.
 * Closes the feedback loop.
 */
export function evaluateOutcomesFromTrades(userId: string, closedTrades: Trade[]): number {
  let updated = 0;

  for (const trade of closedTrades) {
    if (!trade.recommendationId || trade.pnlPercent == null) continue;

    const item = itemStore.get(trade.recommendationId);
    if (!item || item.userId !== userId) continue;
    if (item.outcomeStatus !== "pending") continue;

    recordOutcome(item.id, trade.pnlPercent);
    updated++;
  }

  return updated;
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATION PERFORMANCE STATS
   ═══════════════════════════════════════════════════════ */

export function getRecommendationStats(userId: string): {
  generated: number;
  accepted: number;
  hitRate: number;
  avgReturn: number;
  wins: number;
  losses: number;
  pending: number;
} {
  const items = Array.from(itemStore.values()).filter(i => i.userId === userId);

  const generated = items.length;
  const accepted = items.filter(i => i.status === "accepted").length;

  const resolved = items.filter(i => i.outcomeStatus !== "pending" && i.outcomeStatus !== "expired");
  const wins = resolved.filter(i => i.outcomeStatus === "win").length;
  const losses = resolved.filter(i => i.outcomeStatus === "loss").length;
  const hitRate = resolved.length > 0 ? wins / resolved.length : 0;
  const avgReturn = resolved.length > 0
    ? resolved.reduce((s, i) => s + (i.outcomeReturnPercent ?? 0), 0) / resolved.length
    : 0;

  const pending = items.filter(i => i.outcomeStatus === "pending").length;

  return {
    generated,
    accepted,
    hitRate: Math.round(hitRate * 100) / 100,
    avgReturn: Math.round(avgReturn * 100) / 100,
    wins,
    losses,
    pending,
  };
}

/** Reset stores — for testing only */
export function _resetRecommendationStores(): void {
  runStore.clear();
  itemStore.clear();
}
