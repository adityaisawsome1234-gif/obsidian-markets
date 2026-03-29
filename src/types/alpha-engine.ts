/**
 * Personal Alpha Engine — Domain Types
 *
 * Core type definitions for trade tracking, scoring, recommendations,
 * pattern analysis, and weekly reports.
 */

/* ═══════════════════════════════════════════════════════
   ENUMS & CONSTANTS
   ═══════════════════════════════════════════════════════ */

export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed";
export type TradeSource = "manual" | "imported" | "recommended";
export type AssetType = "STOCK" | "ETF" | "OPTION" | "CRYPTO";

export type MarketCapBucket = "mega" | "large" | "mid" | "small" | "micro";
export type HoldingPeriodBucket = "intraday" | "swing_1_3d" | "swing_4_7d" | "position_1_4w" | "long_term";
export type StrategyTag =
  | "momentum"
  | "mean_reversion"
  | "breakout"
  | "earnings_play"
  | "options_flow"
  | "value"
  | "trend_following"
  | "gap_fill"
  | "sector_rotation"
  | "catalyst"
  | "other";

export type SignalType =
  | "options_flow"
  | "earnings_sentiment"
  | "sec_filing"
  | "price_momentum"
  | "volume_breakout"
  | "technical_pattern"
  | "analyst_revision"
  | "insider_activity"
  | "sector_strength"
  | "macro_signal";

export type RecommendationStatus =
  | "generated"
  | "viewed"
  | "clicked"
  | "accepted"
  | "rejected"
  | "expired";

export type OutcomeStatus =
  | "pending"
  | "win"
  | "loss"
  | "breakeven"
  | "expired";

export type ActionType = "buy" | "sell" | "watch";

export type FactorCategory = "market_conviction" | "personal_edge" | "risk_penalty";

export const SECTORS = [
  "Technology", "Healthcare", "Financials", "Consumer Discretionary",
  "Consumer Staples", "Energy", "Industrials", "Materials",
  "Real Estate", "Utilities", "Communication Services",
] as const;
export type Sector = (typeof SECTORS)[number];

/* ═══════════════════════════════════════════════════════
   TRADES
   ═══════════════════════════════════════════════════════ */

export interface Trade {
  id: string;
  userId: string;
  portfolioId: string | null;
  symbol: string;
  assetType: AssetType;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  openedAt: string; // ISO date
  closedAt: string | null; // ISO date
  holdingPeriodDays: number | null;
  pnlAbsolute: number | null;
  pnlPercent: number | null;
  status: TradeStatus;
  strategyTag: StrategyTag;
  sector: Sector | null;
  marketCapBucket: MarketCapBucket | null;
  source: TradeSource;
  recommendationId: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeCreateInput {
  symbol: string;
  assetType?: AssetType;
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  openedAt: string;
  closedAt?: string;
  strategyTag: StrategyTag;
  sector?: Sector;
  marketCapBucket?: MarketCapBucket;
  source?: TradeSource;
  recommendationId?: string;
  notes?: string;
  tags?: string[];
}

export interface TradeCloseInput {
  exitPrice: number;
  closedAt?: string;
}

/* ═══════════════════════════════════════════════════════
   MARKET SIGNALS
   ═══════════════════════════════════════════════════════ */

export interface MarketSignal {
  id: string;
  symbol: string;
  signalType: SignalType;
  signalTimestamp: string;
  signalStrength: number; // 0-100
  rawPayload: Record<string, unknown>;
  derivedTags: string[];
  sector: Sector | null;
  marketContext: string | null;
  confidenceBase: number; // 0-1
  createdAt: string;
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATIONS
   ═══════════════════════════════════════════════════════ */

export interface RecommendationRun {
  id: string;
  userId: string;
  triggeredAt: string;
  triggerType: "manual" | "scheduled" | "signal";
  symbolsEvaluated: number;
  recommendationsGenerated: number;
  durationMs: number;
  scoringConfigSnapshot: ScoringConfig;
  createdAt: string;
}

export interface RecommendationItem {
  id: string;
  runId: string;
  userId: string;
  symbol: string;
  actionType: ActionType;
  tradeFitScore: number; // 0-100 composite
  marketConvictionScore: number; // 0-100
  personalEdgeScore: number; // 0-100 (can be negative for penalties)
  riskPenaltyScore: number; // 0-100
  finalScore: number; // computed final
  rationaleSummary: string;
  status: RecommendationStatus;
  outcomeStatus: OutcomeStatus;
  outcomeReturnPercent: number | null;
  sector: Sector | null;
  marketCapBucket: MarketCapBucket | null;
  suggestedStrategy: StrategyTag;
  confidenceLevel: "high" | "medium" | "low";
  factors: FactorBreakdown[];
  createdAt: string;
  updatedAt: string;
}

export interface FactorBreakdown {
  id: string;
  recommendationItemId: string;
  factorKey: string;
  factorLabel: string;
  factorCategory: FactorCategory;
  rawValue: number;
  normalizedValue: number; // 0-1
  weight: number;
  contributionScore: number;
  explanation: string;
}

/* ═══════════════════════════════════════════════════════
   PATTERN STATS
   ═══════════════════════════════════════════════════════ */

export interface PatternStats {
  groupKey: string; // e.g. "strategy:momentum" or "sector:Technology"
  groupType: "strategy_tag" | "signal_type" | "sector" | "market_cap_bucket" | "holding_period_bucket";
  groupValue: string;
  winRate: number; // 0-1
  avgReturn: number; // percent
  medianReturn: number;
  maxDrawdown: number; // worst single trade
  bestReturn: number;
  sampleSize: number;
  avgHoldDays: number;
  totalPnl: number;
  profitFactor: number; // gross wins / gross losses
  recentTrend: "improving" | "declining" | "stable"; // based on last 5 vs overall
  confidenceScore: number; // 0-1 based on sample size
  lastUpdated: string;
}

export interface UserEdgeSnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  overallWinRate: number;
  overallAvgReturn: number;
  totalTrades: number;
  totalClosedTrades: number;
  bestSetups: PatternStats[];
  worstSetups: PatternStats[];
  recommendationHitRate: number;
  recommendationsAccepted: number;
  recommendationsGenerated: number;
  behavioralInsights: BehavioralInsight[];
  createdAt: string;
}

export interface BehavioralInsight {
  id: string;
  category: "strength" | "weakness" | "opportunity" | "warning";
  message: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  relatedPattern: string | null;
}

/* ═══════════════════════════════════════════════════════
   WEEKLY REPORT
   ═══════════════════════════════════════════════════════ */

export interface WeeklyAlphaReport {
  id: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  tradesOpened: number;
  tradesClosed: number;
  weekPnl: number;
  weekPnlPercent: number;
  winRate: number;
  whatWorked: ReportSection[];
  whatFailed: ReportSection[];
  missedPatterns: ReportSection[];
  recommendationHitRate: number;
  suggestedAdjustments: string[];
  createdAt: string;
}

export interface ReportSection {
  title: string;
  description: string;
  trades: string[]; // trade IDs
  metric: string;
  metricValue: number;
}

/* ═══════════════════════════════════════════════════════
   SCORING CONFIG
   ═══════════════════════════════════════════════════════ */

export interface ScoringConfig {
  marketConviction: {
    optionsFlowWeight: number;
    earningsSentimentWeight: number;
    secFilingWeight: number;
    priceMomentumWeight: number;
    volumeWeight: number;
    signalConfidenceWeight: number;
  };
  personalEdge: {
    strategyMatchWeight: number;
    sectorMatchWeight: number;
    signalTypeMatchWeight: number;
    holdingPeriodMatchWeight: number;
    marketCapMatchWeight: number;
    recencyDecayFactor: number; // 0-1, how much to weight recent trades
    minSampleSize: number; // minimum trades before trusting personalization
    sampleSizeConfidenceCurve: number; // how fast confidence grows with samples
  };
  riskPenalty: {
    lowSamplePenalty: number;
    poorHistoryPenalty: number;
    concentrationPenalty: number;
    correlatedPositionsPenalty: number;
    volatilityPenalty: number;
    lowConfidencePenalty: number;
    recentLossesPenalty: number;
    maxPenalty: number; // cap total risk penalty
  };
  coldStart: {
    minTradesForPersonalization: number;
    fallbackMarketWeight: number; // weight market conviction when no history
  };
}

/* ═══════════════════════════════════════════════════════
   API RESPONSE TYPES
   ═══════════════════════════════════════════════════════ */

export interface EdgeSummary {
  overallWinRate: number;
  overallAvgReturn: number;
  totalTrades: number;
  totalClosedTrades: number;
  bestSetups: PatternStats[];
  worstSetups: PatternStats[];
  sectorPerformance: PatternStats[];
  recommendationStats: {
    generated: number;
    accepted: number;
    hitRate: number;
    avgReturn: number;
  };
  insights: BehavioralInsight[];
  personalizationConfidence: "high" | "medium" | "low" | "cold_start";
}

export interface RecommendationListResponse {
  items: RecommendationItem[];
  run: RecommendationRun | null;
  totalCount: number;
}

export interface AdminRunDetail {
  run: RecommendationRun;
  items: RecommendationItem[];
  outcomeStats: {
    pending: number;
    wins: number;
    losses: number;
    breakeven: number;
    expired: number;
    avgReturn: number;
  };
}
