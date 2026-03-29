/**
 * Personal Alpha Engine — Scoring Service
 *
 * Deterministic scoring pipeline:
 *   final_score = market_conviction + personal_edge - risk_penalty
 *
 * Every score produces a numeric value, explanation, and factor breakdown.
 * Designed as composable functions for testability and future ML extension.
 */

import type {
  FactorBreakdown,
  FactorCategory,
  MarketSignal,
  PatternStats,
  Trade,
  ScoringConfig,
  MarketCapBucket,
  Sector,
  StrategyTag,
  SignalType,
} from "@/types/alpha-engine";
import { DEFAULT_SCORING_CONFIG, CONFIDENCE_THRESHOLDS, SETUP_QUALITY } from "./config";

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

export interface ScoringInput {
  symbol: string;
  signals: MarketSignal[];
  userPatterns: PatternStats[];
  openPositions: Trade[];
  recentClosedTrades: Trade[]; // last 30 days
  sector: Sector | null;
  marketCapBucket: MarketCapBucket | null;
  suggestedStrategy: StrategyTag;
  config?: ScoringConfig;
}

export interface ScoringResult {
  marketConvictionScore: number;
  personalEdgeScore: number;
  riskPenaltyScore: number;
  finalScore: number;
  tradeFitScore: number;
  confidenceLevel: "high" | "medium" | "low";
  rationaleSummary: string;
  factors: Omit<FactorBreakdown, "id" | "recommendationItemId">[];
}

/* ═══════════════════════════════════════════════════════
   MAIN SCORING PIPELINE
   ═══════════════════════════════════════════════════════ */

export function computeScore(input: ScoringInput): ScoringResult {
  const config = input.config ?? DEFAULT_SCORING_CONFIG;

  const marketFactors = computeMarketConviction(input.signals, config);
  const edgeFactors = computePersonalEdge(input, config);
  const riskFactors = computeRiskPenalty(input, config);

  const marketConvictionScore = sumContributions(marketFactors);
  const personalEdgeScore = sumContributions(edgeFactors);
  const riskPenaltyScore = Math.min(sumContributions(riskFactors), config.riskPenalty.maxPenalty);

  // Cold start: shift weight toward market conviction
  const closedTrades = input.recentClosedTrades.length;
  const isColdStart = closedTrades < config.coldStart.minTradesForPersonalization;
  const marketWeight = isColdStart ? config.coldStart.fallbackMarketWeight : 0.50;
  const edgeWeight = isColdStart ? (1 - marketWeight) : 0.50;

  const rawScore = (marketConvictionScore * marketWeight) + (personalEdgeScore * edgeWeight) - riskPenaltyScore;
  const finalScore = clamp(rawScore, 0, 100);
  const tradeFitScore = clamp(finalScore + (personalEdgeScore * 0.2), 0, 100);

  const confidenceLevel = determineConfidence(input, config);
  const factors = [...marketFactors, ...edgeFactors, ...riskFactors];
  const rationaleSummary = buildRationale(input, marketConvictionScore, personalEdgeScore, riskPenaltyScore, isColdStart, confidenceLevel);

  return {
    marketConvictionScore: round2(marketConvictionScore),
    personalEdgeScore: round2(personalEdgeScore),
    riskPenaltyScore: round2(riskPenaltyScore),
    finalScore: round2(finalScore),
    tradeFitScore: round2(tradeFitScore),
    confidenceLevel,
    rationaleSummary,
    factors,
  };
}

/* ═══════════════════════════════════════════════════════
   A. MARKET CONVICTION
   ═══════════════════════════════════════════════════════ */

function computeMarketConviction(
  signals: MarketSignal[],
  config: ScoringConfig,
): Omit<FactorBreakdown, "id" | "recommendationItemId">[] {
  const weights = config.marketConviction;
  const factors: Omit<FactorBreakdown, "id" | "recommendationItemId">[] = [];

  // Group signals by type
  const byType = groupSignals(signals);

  // Options flow
  const flowSignals = byType.get("options_flow") ?? [];
  const flowStrength = avgStrength(flowSignals);
  factors.push(makeFactor({
    factorKey: "options_flow",
    factorLabel: "Options Flow Strength",
    factorCategory: "market_conviction",
    rawValue: flowStrength,
    normalizedValue: flowStrength / 100,
    weight: weights.optionsFlowWeight,
    contributionScore: (flowStrength / 100) * weights.optionsFlowWeight * 100,
    explanation: flowSignals.length > 0
      ? `${flowSignals.length} options flow signal(s) with avg strength ${flowStrength.toFixed(0)}/100`
      : "No recent options flow signals detected",
  }));

  // Earnings sentiment
  const earningsSignals = byType.get("earnings_sentiment") ?? [];
  const earningsStrength = avgStrength(earningsSignals);
  factors.push(makeFactor({
    factorKey: "earnings_sentiment",
    factorLabel: "Earnings Sentiment",
    factorCategory: "market_conviction",
    rawValue: earningsStrength,
    normalizedValue: earningsStrength / 100,
    weight: weights.earningsSentimentWeight,
    contributionScore: (earningsStrength / 100) * weights.earningsSentimentWeight * 100,
    explanation: earningsSignals.length > 0
      ? `Earnings sentiment at ${earningsStrength.toFixed(0)}/100 based on ${earningsSignals.length} signal(s)`
      : "No recent earnings sentiment data",
  }));

  // SEC filing significance
  const secSignals = byType.get("sec_filing") ?? [];
  const secStrength = avgStrength(secSignals);
  factors.push(makeFactor({
    factorKey: "sec_filing",
    factorLabel: "SEC Filing Significance",
    factorCategory: "market_conviction",
    rawValue: secStrength,
    normalizedValue: secStrength / 100,
    weight: weights.secFilingWeight,
    contributionScore: (secStrength / 100) * weights.secFilingWeight * 100,
    explanation: secSignals.length > 0
      ? `${secSignals.length} SEC filing signal(s) with significance ${secStrength.toFixed(0)}/100`
      : "No notable SEC filing activity",
  }));

  // Price momentum
  const momentumSignals = byType.get("price_momentum") ?? [];
  const momentumStrength = avgStrength(momentumSignals);
  factors.push(makeFactor({
    factorKey: "price_momentum",
    factorLabel: "Price Momentum",
    factorCategory: "market_conviction",
    rawValue: momentumStrength,
    normalizedValue: momentumStrength / 100,
    weight: weights.priceMomentumWeight,
    contributionScore: (momentumStrength / 100) * weights.priceMomentumWeight * 100,
    explanation: momentumStrength > 0
      ? `Price momentum score: ${momentumStrength.toFixed(0)}/100`
      : "No significant price momentum detected",
  }));

  // Volume
  const volumeSignals = byType.get("volume_breakout") ?? [];
  const volumeStrength = avgStrength(volumeSignals);
  factors.push(makeFactor({
    factorKey: "volume",
    factorLabel: "Volume Activity",
    factorCategory: "market_conviction",
    rawValue: volumeStrength,
    normalizedValue: volumeStrength / 100,
    weight: weights.volumeWeight,
    contributionScore: (volumeStrength / 100) * weights.volumeWeight * 100,
    explanation: volumeStrength > 0
      ? `Unusual volume detected, strength ${volumeStrength.toFixed(0)}/100`
      : "Volume within normal range",
  }));

  // Overall signal confidence
  const avgConfidence = signals.length > 0
    ? signals.reduce((sum, s) => sum + s.confidenceBase, 0) / signals.length
    : 0;
  factors.push(makeFactor({
    factorKey: "signal_confidence",
    factorLabel: "Signal Confidence",
    factorCategory: "market_conviction",
    rawValue: avgConfidence * 100,
    normalizedValue: avgConfidence,
    weight: weights.signalConfidenceWeight,
    contributionScore: avgConfidence * weights.signalConfidenceWeight * 100,
    explanation: signals.length > 0
      ? `Average signal confidence: ${(avgConfidence * 100).toFixed(0)}% across ${signals.length} signal(s)`
      : "No signals to evaluate confidence",
  }));

  return factors;
}

/* ═══════════════════════════════════════════════════════
   B. PERSONAL EDGE
   ═══════════════════════════════════════════════════════ */

function computePersonalEdge(
  input: ScoringInput,
  config: ScoringConfig,
): Omit<FactorBreakdown, "id" | "recommendationItemId">[] {
  const weights = config.personalEdge;
  const factors: Omit<FactorBreakdown, "id" | "recommendationItemId">[] = [];
  const patterns = input.userPatterns;

  // Strategy match
  const strategyPattern = findPattern(patterns, "strategy_tag", input.suggestedStrategy);
  const strategyScore = patternToScore(strategyPattern, config);
  factors.push(makeFactor({
    factorKey: "strategy_match",
    factorLabel: "Strategy History Match",
    factorCategory: "personal_edge",
    rawValue: strategyScore,
    normalizedValue: strategyScore / 100,
    weight: weights.strategyMatchWeight,
    contributionScore: (strategyScore / 100) * weights.strategyMatchWeight * 100,
    explanation: strategyPattern
      ? `Your ${input.suggestedStrategy} trades: ${(strategyPattern.winRate * 100).toFixed(0)}% win rate over ${strategyPattern.sampleSize} trades (avg ${strategyPattern.avgReturn.toFixed(1)}% return)`
      : `No history with ${input.suggestedStrategy} strategy — limited personalization`,
  }));

  // Sector match
  const sectorPattern = input.sector ? findPattern(patterns, "sector", input.sector) : null;
  const sectorScore = patternToScore(sectorPattern, config);
  factors.push(makeFactor({
    factorKey: "sector_match",
    factorLabel: "Sector Performance History",
    factorCategory: "personal_edge",
    rawValue: sectorScore,
    normalizedValue: sectorScore / 100,
    weight: weights.sectorMatchWeight,
    contributionScore: (sectorScore / 100) * weights.sectorMatchWeight * 100,
    explanation: sectorPattern
      ? `Your ${input.sector} trades: ${(sectorPattern.winRate * 100).toFixed(0)}% win rate over ${sectorPattern.sampleSize} trades`
      : input.sector
        ? `No trading history in ${input.sector} — sector edge unknown`
        : "Sector not specified",
  }));

  // Signal type match
  const primarySignalType = input.signals.length > 0 ? input.signals[0].signalType : null;
  const signalPattern = primarySignalType ? findPattern(patterns, "signal_type", primarySignalType) : null;
  const signalScore = patternToScore(signalPattern, config);
  factors.push(makeFactor({
    factorKey: "signal_type_match",
    factorLabel: "Signal Type History",
    factorCategory: "personal_edge",
    rawValue: signalScore,
    normalizedValue: signalScore / 100,
    weight: weights.signalTypeMatchWeight,
    contributionScore: (signalScore / 100) * weights.signalTypeMatchWeight * 100,
    explanation: signalPattern
      ? `Your trades on ${primarySignalType} signals: ${(signalPattern.winRate * 100).toFixed(0)}% win rate (${signalPattern.sampleSize} trades)`
      : "No history with this signal type",
  }));

  // Market cap match
  const capPattern = input.marketCapBucket ? findPattern(patterns, "market_cap_bucket", input.marketCapBucket) : null;
  const capScore = patternToScore(capPattern, config);
  factors.push(makeFactor({
    factorKey: "market_cap_match",
    factorLabel: "Market Cap History",
    factorCategory: "personal_edge",
    rawValue: capScore,
    normalizedValue: capScore / 100,
    weight: weights.marketCapMatchWeight,
    contributionScore: (capScore / 100) * weights.marketCapMatchWeight * 100,
    explanation: capPattern
      ? `Your ${input.marketCapBucket}-cap trades: ${(capPattern.winRate * 100).toFixed(0)}% win rate (${capPattern.sampleSize} trades)`
      : "No history with this market cap segment",
  }));

  // Holding period match (use suggested strategy to infer typical hold)
  const holdPattern = findPattern(patterns, "holding_period_bucket", inferHoldBucket(input.suggestedStrategy));
  const holdScore = patternToScore(holdPattern, config);
  factors.push(makeFactor({
    factorKey: "holding_period_match",
    factorLabel: "Holding Period History",
    factorCategory: "personal_edge",
    rawValue: holdScore,
    normalizedValue: holdScore / 100,
    weight: weights.holdingPeriodMatchWeight,
    contributionScore: (holdScore / 100) * weights.holdingPeriodMatchWeight * 100,
    explanation: holdPattern
      ? `Your trades with similar holding period: ${(holdPattern.winRate * 100).toFixed(0)}% win rate, avg ${holdPattern.avgHoldDays.toFixed(0)} days`
      : "No history with similar holding periods",
  }));

  return factors;
}

/* ═══════════════════════════════════════════════════════
   C. RISK PENALTY
   ═══════════════════════════════════════════════════════ */

function computeRiskPenalty(
  input: ScoringInput,
  config: ScoringConfig,
): Omit<FactorBreakdown, "id" | "recommendationItemId">[] {
  const penalty = config.riskPenalty;
  const factors: Omit<FactorBreakdown, "id" | "recommendationItemId">[] = [];

  // Low sample size
  const totalClosed = input.recentClosedTrades.length;
  const lowSampleActive = totalClosed < config.personalEdge.minSampleSize;
  factors.push(makeFactor({
    factorKey: "low_sample_size",
    factorLabel: "Insufficient Trade History",
    factorCategory: "risk_penalty",
    rawValue: lowSampleActive ? 1 : 0,
    normalizedValue: lowSampleActive ? 1 : 0,
    weight: penalty.lowSamplePenalty,
    contributionScore: lowSampleActive ? penalty.lowSamplePenalty : 0,
    explanation: lowSampleActive
      ? `Only ${totalClosed} closed trades — personalization confidence is low. Recommendation weighted toward market signals.`
      : `${totalClosed} closed trades provide reasonable personalization confidence`,
  }));

  // Poor historical performance for this setup
  const strategyPattern = findPattern(input.userPatterns, "strategy_tag", input.suggestedStrategy);
  const poorHistory = strategyPattern && strategyPattern.sampleSize >= 3 && strategyPattern.winRate < SETUP_QUALITY.avoid;
  factors.push(makeFactor({
    factorKey: "poor_history",
    factorLabel: "Poor Setup History",
    factorCategory: "risk_penalty",
    rawValue: poorHistory ? strategyPattern!.winRate : 0,
    normalizedValue: poorHistory ? 1 : 0,
    weight: penalty.poorHistoryPenalty,
    contributionScore: poorHistory ? penalty.poorHistoryPenalty : 0,
    explanation: poorHistory
      ? `Warning: Your ${input.suggestedStrategy} trades have a ${(strategyPattern!.winRate * 100).toFixed(0)}% win rate — historically a weak setup for you`
      : "No significant negative pattern detected for this setup",
  }));

  // Concentration risk
  const sameSymbolPositions = input.openPositions.filter(t => t.symbol === input.symbol);
  const concentrationActive = sameSymbolPositions.length > 0;
  factors.push(makeFactor({
    factorKey: "concentration",
    factorLabel: "Position Concentration",
    factorCategory: "risk_penalty",
    rawValue: sameSymbolPositions.length,
    normalizedValue: concentrationActive ? Math.min(sameSymbolPositions.length / 3, 1) : 0,
    weight: penalty.concentrationPenalty,
    contributionScore: concentrationActive
      ? Math.min(sameSymbolPositions.length / 3, 1) * penalty.concentrationPenalty
      : 0,
    explanation: concentrationActive
      ? `You already have ${sameSymbolPositions.length} open position(s) in ${input.symbol} — adding more increases concentration risk`
      : "No existing positions in this symbol",
  }));

  // Correlated positions (same sector)
  const sameSectorPositions = input.sector
    ? input.openPositions.filter(t => t.sector === input.sector && t.symbol !== input.symbol)
    : [];
  const correlatedActive = sameSectorPositions.length >= 2;
  factors.push(makeFactor({
    factorKey: "correlated_positions",
    factorLabel: "Correlated Sector Exposure",
    factorCategory: "risk_penalty",
    rawValue: sameSectorPositions.length,
    normalizedValue: correlatedActive ? Math.min(sameSectorPositions.length / 5, 1) : 0,
    weight: penalty.correlatedPositionsPenalty,
    contributionScore: correlatedActive
      ? Math.min(sameSectorPositions.length / 5, 1) * penalty.correlatedPositionsPenalty
      : 0,
    explanation: correlatedActive
      ? `${sameSectorPositions.length} other open positions in ${input.sector} — sector overexposure risk`
      : "Sector exposure within acceptable range",
  }));

  // Recent losses in same pattern
  const recentLosses = input.recentClosedTrades.filter(
    t => t.strategyTag === input.suggestedStrategy && t.pnlPercent !== null && t.pnlPercent < 0
  );
  const recentLossActive = recentLosses.length >= 2;
  factors.push(makeFactor({
    factorKey: "recent_losses",
    factorLabel: "Recent Losses in Pattern",
    factorCategory: "risk_penalty",
    rawValue: recentLosses.length,
    normalizedValue: recentLossActive ? Math.min(recentLosses.length / 5, 1) : 0,
    weight: penalty.recentLossesPenalty,
    contributionScore: recentLossActive
      ? Math.min(recentLosses.length / 5, 1) * penalty.recentLossesPenalty
      : 0,
    explanation: recentLossActive
      ? `${recentLosses.length} recent losing trades in ${input.suggestedStrategy} — consider pausing this setup`
      : "No concerning recent loss pattern",
  }));

  // Low signal confidence
  const avgConfidence = input.signals.length > 0
    ? input.signals.reduce((sum, s) => sum + s.confidenceBase, 0) / input.signals.length
    : 0;
  const lowConfActive = avgConfidence < 0.4 && input.signals.length > 0;
  factors.push(makeFactor({
    factorKey: "low_confidence",
    factorLabel: "Low Signal Confidence",
    factorCategory: "risk_penalty",
    rawValue: avgConfidence * 100,
    normalizedValue: lowConfActive ? 1 - avgConfidence : 0,
    weight: penalty.lowConfidencePenalty,
    contributionScore: lowConfActive ? (1 - avgConfidence) * penalty.lowConfidencePenalty : 0,
    explanation: lowConfActive
      ? `Signal confidence is only ${(avgConfidence * 100).toFixed(0)}% — higher uncertainty in this recommendation`
      : "Signal confidence is adequate",
  }));

  return factors;
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function makeFactor(f: Omit<FactorBreakdown, "id" | "recommendationItemId">): Omit<FactorBreakdown, "id" | "recommendationItemId"> {
  return {
    factorKey: f.factorKey,
    factorLabel: f.factorLabel,
    factorCategory: f.factorCategory,
    rawValue: round2(f.rawValue),
    normalizedValue: round2(f.normalizedValue),
    weight: round2(f.weight),
    contributionScore: round2(f.contributionScore),
    explanation: f.explanation,
  };
}

function sumContributions(factors: Omit<FactorBreakdown, "id" | "recommendationItemId">[]): number {
  return factors.reduce((sum, f) => sum + f.contributionScore, 0);
}

function groupSignals(signals: MarketSignal[]): Map<SignalType, MarketSignal[]> {
  const map = new Map<SignalType, MarketSignal[]>();
  for (const s of signals) {
    const list = map.get(s.signalType) ?? [];
    list.push(s);
    map.set(s.signalType, list);
  }
  return map;
}

function avgStrength(signals: MarketSignal[]): number {
  if (signals.length === 0) return 0;
  return signals.reduce((sum, s) => sum + s.signalStrength, 0) / signals.length;
}

function findPattern(
  patterns: PatternStats[],
  groupType: PatternStats["groupType"],
  groupValue: string,
): PatternStats | null {
  return patterns.find(p => p.groupType === groupType && p.groupValue === groupValue) ?? null;
}

/**
 * Convert a user's pattern stats into a 0-100 edge score.
 * Accounts for win rate, sample size confidence, and average return.
 */
function patternToScore(pattern: PatternStats | null, config: ScoringConfig): number {
  if (!pattern || pattern.sampleSize === 0) return 0;

  // Sample size confidence: 1 - e^(-curve * sampleSize)
  const sizeConfidence = 1 - Math.exp(-config.personalEdge.sampleSizeConfidenceCurve * pattern.sampleSize);

  // Win rate contribution (0-60 points)
  const winRateScore = pattern.winRate * 60;

  // Return contribution (0-30 points, capped at +20% avg)
  const returnScore = Math.min(Math.max(pattern.avgReturn / 20, -0.5), 1) * 30;

  // Profit factor bonus (0-10 points)
  const pfScore = Math.min(pattern.profitFactor / 3, 1) * 10;

  const rawScore = winRateScore + returnScore + pfScore;
  return clamp(rawScore * sizeConfidence, 0, 100);
}

function inferHoldBucket(strategy: StrategyTag): string {
  const map: Record<StrategyTag, string> = {
    momentum: "swing_1_3d",
    mean_reversion: "swing_1_3d",
    breakout: "swing_4_7d",
    earnings_play: "swing_1_3d",
    options_flow: "swing_1_3d",
    value: "long_term",
    trend_following: "position_1_4w",
    gap_fill: "intraday",
    sector_rotation: "position_1_4w",
    catalyst: "swing_4_7d",
    other: "swing_4_7d",
  };
  return map[strategy];
}

function determineConfidence(input: ScoringInput, config: ScoringConfig): "high" | "medium" | "low" {
  const closedTrades = input.recentClosedTrades.length;
  if (closedTrades < config.coldStart.minTradesForPersonalization) return "low";

  const relevantPatterns = input.userPatterns.filter(p => p.sampleSize >= CONFIDENCE_THRESHOLDS.medium);
  if (relevantPatterns.length >= 3 && closedTrades >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (relevantPatterns.length >= 1 && closedTrades >= CONFIDENCE_THRESHOLDS.low) return "medium";
  return "low";
}

function buildRationale(
  input: ScoringInput,
  marketScore: number,
  edgeScore: number,
  riskScore: number,
  isColdStart: boolean,
  confidence: "high" | "medium" | "low",
): string {
  const parts: string[] = [];

  // Market conviction summary
  if (marketScore >= 60) {
    parts.push(`Strong market signals for ${input.symbol} (conviction ${marketScore.toFixed(0)}/100)`);
  } else if (marketScore >= 30) {
    parts.push(`Moderate market signals for ${input.symbol} (conviction ${marketScore.toFixed(0)}/100)`);
  } else {
    parts.push(`Weak market signals for ${input.symbol} (conviction ${marketScore.toFixed(0)}/100)`);
  }

  // Personal edge summary
  if (isColdStart) {
    parts.push("Limited trade history — recommendation weighted toward market signals.");
  } else if (edgeScore >= 50) {
    parts.push(`This setup historically aligns with your strongest trading patterns (edge ${edgeScore.toFixed(0)}/100).`);
  } else if (edgeScore >= 25) {
    parts.push(`Moderate alignment with your trading patterns (edge ${edgeScore.toFixed(0)}/100).`);
  } else {
    parts.push(`Limited evidence from your past trades for this type of setup (edge ${edgeScore.toFixed(0)}/100).`);
  }

  // Risk summary
  if (riskScore >= 30) {
    parts.push(`Elevated risk factors reduce the score by ${riskScore.toFixed(0)} points.`);
  } else if (riskScore > 0) {
    parts.push(`Minor risk factors noted (penalty ${riskScore.toFixed(0)}/100).`);
  }

  // Confidence disclaimer
  if (confidence === "low") {
    parts.push("Higher uncertainty due to low sample size.");
  }

  return parts.join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
