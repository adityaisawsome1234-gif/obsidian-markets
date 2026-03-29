/**
 * Personal Alpha Engine — Scoring Configuration
 *
 * All weights and thresholds are centralized here for easy tuning.
 * V1 uses deterministic rules; this config layer enables future ML override.
 */

import type { ScoringConfig } from "@/types/alpha-engine";

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  marketConviction: {
    optionsFlowWeight: 0.25,
    earningsSentimentWeight: 0.20,
    secFilingWeight: 0.10,
    priceMomentumWeight: 0.20,
    volumeWeight: 0.10,
    signalConfidenceWeight: 0.15,
  },
  personalEdge: {
    strategyMatchWeight: 0.30,
    sectorMatchWeight: 0.20,
    signalTypeMatchWeight: 0.15,
    holdingPeriodMatchWeight: 0.10,
    marketCapMatchWeight: 0.10,
    recencyDecayFactor: 0.85, // trades lose 15% relevance per month
    minSampleSize: 5,
    sampleSizeConfidenceCurve: 0.15, // confidence = 1 - e^(-0.15 * sampleSize)
  },
  riskPenalty: {
    lowSamplePenalty: 15,
    poorHistoryPenalty: 25,
    concentrationPenalty: 20,
    correlatedPositionsPenalty: 15,
    volatilityPenalty: 10,
    lowConfidencePenalty: 10,
    recentLossesPenalty: 20,
    maxPenalty: 60, // cap at 60 out of 100
  },
  coldStart: {
    minTradesForPersonalization: 5,
    fallbackMarketWeight: 0.85, // rely 85% on market conviction when cold start
  },
};

/** Holding period bucket boundaries in days */
export const HOLDING_PERIOD_BUCKETS = {
  intraday: { min: 0, max: 0 },
  swing_1_3d: { min: 1, max: 3 },
  swing_4_7d: { min: 4, max: 7 },
  position_1_4w: { min: 8, max: 28 },
  long_term: { min: 29, max: Infinity },
} as const;

/** Sample size thresholds for confidence levels */
export const CONFIDENCE_THRESHOLDS = {
  high: 20,
  medium: 10,
  low: 5,
} as const;

/** Win rate thresholds for categorizing setup quality */
export const SETUP_QUALITY = {
  strong: 0.65, // 65%+ win rate
  decent: 0.50,
  weak: 0.40,
  avoid: 0.30,
} as const;

/** How many recent trades to use for "recent trend" calculation */
export const RECENT_TRADE_WINDOW = 5;

/** Maximum age (days) for a market signal to be considered "active" */
export const MAX_SIGNAL_AGE_DAYS = 7;

/** How many recommendations to generate per run */
export const MAX_RECOMMENDATIONS_PER_RUN = 10;

/** Minimum final score to include in recommendations */
export const MIN_RECOMMENDATION_SCORE = 15;
