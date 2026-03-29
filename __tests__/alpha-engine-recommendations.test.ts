/**
 * Unit tests for Personal Alpha Engine — Recommendations
 *
 * Run: npx tsx --test __tests__/alpha-engine-recommendations.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createTrade,
  _resetTradeStore,
} from "../src/services/alpha-engine/trade.service";
import {
  generateRecommendations,
  getLatestRecommendations,
  updateRecommendationStatus,
  recordOutcome,
  getRecommendationStats,
  _resetRecommendationStores,
  type CandidateSymbol,
} from "../src/services/alpha-engine/recommendation.service";
import type { MarketSignal } from "../src/types/alpha-engine";

const USER_ID = "test_user";

function makeCandidates(): CandidateSymbol[] {
  const now = new Date().toISOString();
  return [
    {
      symbol: "NVDA",
      signals: [
        { id: "s1", symbol: "NVDA", signalType: "options_flow", signalTimestamp: now, signalStrength: 80, rawPayload: {}, derivedTags: [], sector: "Technology", marketContext: null, confidenceBase: 0.75, createdAt: now },
        { id: "s2", symbol: "NVDA", signalType: "earnings_sentiment", signalTimestamp: now, signalStrength: 70, rawPayload: {}, derivedTags: [], sector: "Technology", marketContext: null, confidenceBase: 0.7, createdAt: now },
      ],
      sector: "Technology",
      marketCapBucket: "mega",
      suggestedStrategy: "momentum",
      suggestedAction: "buy",
    },
    {
      symbol: "AAPL",
      signals: [
        { id: "s3", symbol: "AAPL", signalType: "price_momentum", signalTimestamp: now, signalStrength: 55, rawPayload: {}, derivedTags: [], sector: "Technology", marketContext: null, confidenceBase: 0.5, createdAt: now },
      ],
      sector: "Technology",
      marketCapBucket: "mega",
      suggestedStrategy: "value",
      suggestedAction: "buy",
    },
  ];
}

function seedTradeHistory() {
  for (let i = 0; i < 8; i++) {
    createTrade(USER_ID, {
      symbol: "NVDA",
      side: "long",
      quantity: 50,
      entryPrice: 120 + i,
      exitPrice: 120 + i + (i % 3 === 0 ? -3 : 8),
      openedAt: new Date(Date.now() - (30 + i) * 86400000).toISOString(),
      closedAt: new Date(Date.now() - (25 + i) * 86400000).toISOString(),
      strategyTag: "momentum",
      sector: "Technology",
      marketCapBucket: "mega",
    });
  }
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATION GENERATION
   ═══════════════════════════════════════════════════════ */

describe("Recommendation Generation", () => {
  beforeEach(() => {
    _resetTradeStore();
    _resetRecommendationStores();
  });

  it("generates recommendations from candidates", () => {
    seedTradeHistory();
    const { run, items } = generateRecommendations(USER_ID, makeCandidates());

    assert.ok(run.id.startsWith("run_"));
    assert.equal(run.symbolsEvaluated, 2);
    assert.ok(items.length > 0);
    assert.ok(items.length <= 10);
  });

  it("each recommendation has required score fields", () => {
    seedTradeHistory();
    const { items } = generateRecommendations(USER_ID, makeCandidates());

    for (const item of items) {
      assert.ok(item.id.startsWith("rec_"));
      assert.ok(typeof item.finalScore === "number");
      assert.ok(typeof item.marketConvictionScore === "number");
      assert.ok(typeof item.personalEdgeScore === "number");
      assert.ok(typeof item.riskPenaltyScore === "number");
      assert.ok(typeof item.tradeFitScore === "number");
      assert.ok(item.rationaleSummary.length > 0, "Should have rationale");
      assert.ok(item.factors.length > 0, "Should have factor breakdown");
      assert.equal(item.status, "generated");
      assert.equal(item.outcomeStatus, "pending");
    }
  });

  it("sorts recommendations by final score descending", () => {
    seedTradeHistory();
    const { items } = generateRecommendations(USER_ID, makeCandidates());

    for (let i = 1; i < items.length; i++) {
      assert.ok(items[i - 1].finalScore >= items[i].finalScore,
        `Item ${i - 1} (${items[i - 1].finalScore}) should >= item ${i} (${items[i].finalScore})`);
    }
  });

  it("each factor has an explanation", () => {
    seedTradeHistory();
    const { items } = generateRecommendations(USER_ID, makeCandidates());

    for (const item of items) {
      for (const factor of item.factors) {
        assert.ok(factor.explanation.length > 0, `Factor ${factor.factorKey} missing explanation`);
        assert.ok(factor.factorLabel.length > 0);
        assert.ok(factor.recommendationItemId === item.id);
      }
    }
  });

  it("works with no trade history (cold start)", () => {
    // No seedTradeHistory() — cold start
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    assert.ok(items.length > 0, "Should still produce recommendations in cold start");

    for (const item of items) {
      assert.ok(item.confidenceLevel === "low", `Cold start should have low confidence, got ${item.confidenceLevel}`);
    }
  });
});

/* ═══════════════════════════════════════════════════════
   STATUS MANAGEMENT
   ═══════════════════════════════════════════════════════ */

describe("Recommendation Status", () => {
  beforeEach(() => {
    _resetTradeStore();
    _resetRecommendationStores();
  });

  it("updates status to accepted", () => {
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    const item = items[0];

    const updated = updateRecommendationStatus(USER_ID, item.id, "accepted");
    assert.ok(updated);
    assert.equal(updated!.status, "accepted");
  });

  it("rejects update from wrong user", () => {
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    const result = updateRecommendationStatus("other_user", items[0].id, "accepted");
    assert.equal(result, null);
  });
});

/* ═══════════════════════════════════════════════════════
   OUTCOME TRACKING
   ═══════════════════════════════════════════════════════ */

describe("Outcome Tracking", () => {
  beforeEach(() => {
    _resetTradeStore();
    _resetRecommendationStores();
  });

  it("records positive outcome as win", () => {
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    const updated = recordOutcome(items[0].id, 5.2);
    assert.ok(updated);
    assert.equal(updated!.outcomeStatus, "win");
    assert.equal(updated!.outcomeReturnPercent, 5.2);
  });

  it("records negative outcome as loss", () => {
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    const updated = recordOutcome(items[0].id, -3.5);
    assert.ok(updated);
    assert.equal(updated!.outcomeStatus, "loss");
  });

  it("records near-zero outcome as breakeven", () => {
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    const updated = recordOutcome(items[0].id, 0.2);
    assert.ok(updated);
    assert.equal(updated!.outcomeStatus, "breakeven");
  });

  it("computes recommendation stats correctly", () => {
    const { items } = generateRecommendations(USER_ID, makeCandidates());
    updateRecommendationStatus(USER_ID, items[0].id, "accepted");
    recordOutcome(items[0].id, 5.0);

    if (items.length > 1) {
      recordOutcome(items[1].id, -2.0);
    }

    const stats = getRecommendationStats(USER_ID);
    assert.equal(stats.generated, items.length);
    assert.equal(stats.accepted, 1);
    assert.ok(stats.wins >= 1);
  });
});

/* ═══════════════════════════════════════════════════════
   QUERY
   ═══════════════════════════════════════════════════════ */

describe("Recommendation Queries", () => {
  beforeEach(() => {
    _resetTradeStore();
    _resetRecommendationStores();
  });

  it("returns latest recommendations", () => {
    generateRecommendations(USER_ID, makeCandidates());
    const { items, run } = getLatestRecommendations(USER_ID);
    assert.ok(run !== null);
    assert.ok(items.length > 0);
  });

  it("returns empty for user with no recommendations", () => {
    const { items, run } = getLatestRecommendations("no_recs_user");
    assert.equal(run, null);
    assert.equal(items.length, 0);
  });
});
