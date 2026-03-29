/**
 * Unit tests for Personal Alpha Engine — Scoring Service
 *
 * Run: npx tsx --test __tests__/alpha-engine-scoring.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { computeScore, type ScoringInput } from "../src/services/alpha-engine/scoring.service";
import type { MarketSignal, PatternStats, Trade } from "../src/types/alpha-engine";
import { DEFAULT_SCORING_CONFIG } from "../src/services/alpha-engine/config";

/* ═══════════════════════════════════════════════════════
   TEST HELPERS
   ═══════════════════════════════════════════════════════ */

function makeSignal(overrides?: Partial<MarketSignal>): MarketSignal {
  return {
    id: "sig_1",
    symbol: "NVDA",
    signalType: "options_flow",
    signalTimestamp: new Date().toISOString(),
    signalStrength: 70,
    rawPayload: {},
    derivedTags: [],
    sector: "Technology",
    marketContext: null,
    confidenceBase: 0.7,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePattern(overrides?: Partial<PatternStats>): PatternStats {
  return {
    groupKey: "strategy_tag:momentum",
    groupType: "strategy_tag",
    groupValue: "momentum",
    winRate: 0.65,
    avgReturn: 3.5,
    medianReturn: 2.8,
    maxDrawdown: -8.0,
    bestReturn: 15.2,
    sampleSize: 20,
    avgHoldDays: 4,
    totalPnl: 2500,
    profitFactor: 2.1,
    recentTrend: "stable",
    confidenceScore: 0.95,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function makeTrade(overrides?: Partial<Trade>): Trade {
  return {
    id: "trade_1",
    userId: "user_1",
    portfolioId: null,
    symbol: "NVDA",
    assetType: "STOCK",
    side: "long",
    quantity: 100,
    entryPrice: 130,
    exitPrice: 140,
    openedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    closedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    holdingPeriodDays: 5,
    pnlAbsolute: 1000,
    pnlPercent: 7.69,
    status: "closed",
    strategyTag: "momentum",
    sector: "Technology",
    marketCapBucket: "mega",
    source: "manual",
    recommendationId: null,
    notes: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function baseInput(overrides?: Partial<ScoringInput>): ScoringInput {
  return {
    symbol: "NVDA",
    signals: [makeSignal()],
    userPatterns: [makePattern()],
    openPositions: [],
    recentClosedTrades: Array.from({ length: 10 }, (_, i) => makeTrade({ id: `trade_${i}` })),
    sector: "Technology",
    marketCapBucket: "mega",
    suggestedStrategy: "momentum",
    config: DEFAULT_SCORING_CONFIG,
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════
   SCORING PIPELINE
   ═══════════════════════════════════════════════════════ */

describe("Scoring Pipeline — computeScore", () => {
  it("returns all required fields", () => {
    const result = computeScore(baseInput());
    assert.ok(typeof result.marketConvictionScore === "number");
    assert.ok(typeof result.personalEdgeScore === "number");
    assert.ok(typeof result.riskPenaltyScore === "number");
    assert.ok(typeof result.finalScore === "number");
    assert.ok(typeof result.tradeFitScore === "number");
    assert.ok(["high", "medium", "low"].includes(result.confidenceLevel));
    assert.ok(result.rationaleSummary.length > 0);
    assert.ok(result.factors.length > 0);
  });

  it("scores between 0 and 100", () => {
    const result = computeScore(baseInput());
    assert.ok(result.finalScore >= 0 && result.finalScore <= 100, `Final score ${result.finalScore} out of range`);
    assert.ok(result.tradeFitScore >= 0 && result.tradeFitScore <= 100, `Trade fit score ${result.tradeFitScore} out of range`);
  });

  it("produces higher score with strong signals", () => {
    const weakInput = baseInput({
      signals: [makeSignal({ signalStrength: 20, confidenceBase: 0.2 })],
    });
    const strongInput = baseInput({
      signals: [
        makeSignal({ signalStrength: 90, confidenceBase: 0.9 }),
        makeSignal({ signalType: "earnings_sentiment", signalStrength: 85, confidenceBase: 0.85, id: "sig_2" }),
        makeSignal({ signalType: "price_momentum", signalStrength: 80, confidenceBase: 0.8, id: "sig_3" }),
      ],
    });

    const weakResult = computeScore(weakInput);
    const strongResult = computeScore(strongInput);
    assert.ok(strongResult.finalScore > weakResult.finalScore,
      `Strong (${strongResult.finalScore}) should beat weak (${weakResult.finalScore})`);
  });

  it("boosts score when user has positive history for the setup", () => {
    const noHistory = baseInput({ userPatterns: [] });
    const goodHistory = baseInput({
      userPatterns: [
        makePattern({ winRate: 0.75, avgReturn: 5.0, sampleSize: 25 }),
        makePattern({ groupType: "sector", groupValue: "Technology", winRate: 0.70, avgReturn: 4.0, sampleSize: 15 }),
      ],
    });

    const noHistResult = computeScore(noHistory);
    const goodHistResult = computeScore(goodHistory);
    assert.ok(goodHistResult.personalEdgeScore > noHistResult.personalEdgeScore,
      `Good history edge (${goodHistResult.personalEdgeScore}) should exceed no history (${noHistResult.personalEdgeScore})`);
  });

  it("penalizes when user has poor history for the setup", () => {
    const poorHistory = baseInput({
      userPatterns: [
        makePattern({ winRate: 0.25, avgReturn: -2.5, sampleSize: 15 }),
      ],
    });

    const result = computeScore(poorHistory);
    assert.ok(result.riskPenaltyScore > 0, "Should have risk penalty for poor history");
  });

  it("every factor has an explanation", () => {
    const result = computeScore(baseInput());
    for (const factor of result.factors) {
      assert.ok(factor.explanation.length > 0, `Factor ${factor.factorKey} missing explanation`);
      assert.ok(factor.factorLabel.length > 0, `Factor ${factor.factorKey} missing label`);
      assert.ok(["market_conviction", "personal_edge", "risk_penalty"].includes(factor.factorCategory),
        `Factor ${factor.factorKey} has invalid category ${factor.factorCategory}`);
    }
  });
});

/* ═══════════════════════════════════════════════════════
   COLD START
   ═══════════════════════════════════════════════════════ */

describe("Scoring — Cold Start", () => {
  it("returns low confidence with no trade history", () => {
    const input = baseInput({
      userPatterns: [],
      recentClosedTrades: [],
    });
    const result = computeScore(input);
    assert.equal(result.confidenceLevel, "low");
  });

  it("relies more on market conviction in cold start", () => {
    const coldInput = baseInput({
      userPatterns: [],
      recentClosedTrades: [],
      signals: [makeSignal({ signalStrength: 80, confidenceBase: 0.8 })],
    });
    const result = computeScore(coldInput);
    assert.ok(result.marketConvictionScore > 0, "Market conviction should contribute");
    assert.ok(result.rationaleSummary.includes("Limited trade history") || result.rationaleSummary.includes("market signals"),
      "Rationale should mention limited history");
  });

  it("applies low sample size penalty", () => {
    const input = baseInput({ recentClosedTrades: [] });
    const result = computeScore(input);
    const lowSampleFactor = result.factors.find(f => f.factorKey === "low_sample_size");
    assert.ok(lowSampleFactor, "Should have low sample size factor");
    assert.ok(lowSampleFactor!.contributionScore > 0, "Should have positive penalty contribution");
  });
});

/* ═══════════════════════════════════════════════════════
   RISK PENALTIES
   ═══════════════════════════════════════════════════════ */

describe("Scoring — Risk Penalties", () => {
  it("penalizes existing position in same symbol", () => {
    const input = baseInput({
      openPositions: [makeTrade({ status: "open", exitPrice: null, closedAt: null })],
    });
    const result = computeScore(input);
    const concFactor = result.factors.find(f => f.factorKey === "concentration");
    assert.ok(concFactor, "Should have concentration factor");
    assert.ok(concFactor!.contributionScore > 0, "Should penalize for concentration");
  });

  it("penalizes correlated sector positions", () => {
    const input = baseInput({
      openPositions: [
        makeTrade({ id: "t1", symbol: "AAPL", sector: "Technology", status: "open", exitPrice: null }),
        makeTrade({ id: "t2", symbol: "MSFT", sector: "Technology", status: "open", exitPrice: null }),
        makeTrade({ id: "t3", symbol: "GOOGL", sector: "Technology", status: "open", exitPrice: null }),
      ],
    });
    const result = computeScore(input);
    const corrFactor = result.factors.find(f => f.factorKey === "correlated_positions");
    assert.ok(corrFactor, "Should have correlated positions factor");
    assert.ok(corrFactor!.contributionScore > 0, "Should penalize for sector correlation");
  });

  it("penalizes recent losses in same strategy", () => {
    const recentLosers = Array.from({ length: 4 }, (_, i) =>
      makeTrade({
        id: `loser_${i}`,
        pnlPercent: -5,
        strategyTag: "momentum",
        closedAt: new Date(Date.now() - i * 86400000).toISOString(),
      })
    );
    const input = baseInput({ recentClosedTrades: recentLosers });
    const result = computeScore(input);
    const lossFactor = result.factors.find(f => f.factorKey === "recent_losses");
    assert.ok(lossFactor, "Should have recent losses factor");
    assert.ok(lossFactor!.contributionScore > 0, "Should penalize for recent losses");
  });

  it("caps total risk penalty at configured max", () => {
    const input = baseInput({
      openPositions: [
        makeTrade({ id: "t1", symbol: "NVDA", status: "open", exitPrice: null }),
        makeTrade({ id: "t2", symbol: "NVDA", status: "open", exitPrice: null }),
        makeTrade({ id: "t3", symbol: "NVDA", status: "open", exitPrice: null }),
      ],
      recentClosedTrades: Array.from({ length: 5 }, (_, i) =>
        makeTrade({ id: `bad_${i}`, pnlPercent: -10, strategyTag: "momentum" })
      ),
      userPatterns: [makePattern({ winRate: 0.15, avgReturn: -8, sampleSize: 20 })],
      signals: [makeSignal({ confidenceBase: 0.1 })],
    });
    const result = computeScore(input);
    assert.ok(result.riskPenaltyScore <= DEFAULT_SCORING_CONFIG.riskPenalty.maxPenalty,
      `Risk penalty ${result.riskPenaltyScore} should not exceed max ${DEFAULT_SCORING_CONFIG.riskPenalty.maxPenalty}`);
  });
});

/* ═══════════════════════════════════════════════════════
   NO SIGNALS
   ═══════════════════════════════════════════════════════ */

describe("Scoring — No Signals", () => {
  it("handles empty signals gracefully", () => {
    const input = baseInput({ signals: [] });
    const result = computeScore(input);
    assert.ok(result.finalScore >= 0);
    assert.equal(result.marketConvictionScore, 0, "Market conviction should be 0 with no signals");
  });
});
