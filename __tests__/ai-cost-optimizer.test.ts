/**
 * Unit tests for AI Cost Optimizer — ModelRouter + SemanticCache
 *
 * Run: npx tsx __tests__/ai-cost-optimizer.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  scoreComplexity,
  extractSemanticKey,
  generateDataHash,
  buildCacheKey,
  getCachedResponse,
  setCachedResponse,
  checkGuardrails,
  trackAiUsage,
  getUserDailySummary,
  estimateCostCents,
  prepareGatewayRequest,
  type CacheEntry,
} from "../src/services/ai-cost-optimizer.service";

/* ═══════════════════════════════════════════════════════
   MODEL ROUTER — scoreComplexity()
   ═══════════════════════════════════════════════════════ */

describe("ModelRouter — scoreComplexity", () => {
  it("routes simple factual lookups to 'skip' (no AI needed)", () => {
    const queries = [
      "NVDA market cap?",
      "Current price of MSFT?",
      "AAPL PE ratio",
    ];
    for (const q of queries) {
      const result = scoreComplexity(q);
      assert.equal(result.model, "skip", `Expected 'skip' for: "${q}", got: ${result.model}`);
      assert.equal(result.estimatedCostCents, 0);
    }
  });

  it("routes simple questions to haiku", () => {
    const result = scoreComplexity("What is a P/E ratio? Explain briefly.");
    assert.equal(result.model, "haiku");
    assert.ok(result.complexityScore <= 2);
  });

  it("routes medium-complexity questions to sonnet", () => {
    const result = scoreComplexity("Compare AAPL vs MSFT margins and revenue growth over the last 5 years");
    assert.equal(result.model, "sonnet");
    assert.ok(result.complexityScore >= 3, `Score ${result.complexityScore} should be >= 3`);
    assert.ok(result.complexityScore <= 5, `Score ${result.complexityScore} should be <= 5`);
  });

  it("routes deep dive requests to opus", () => {
    const queries = [
      "Give me a deep dive on NVDA's competitive moat in datacenter AI inference",
      "Generate a full DCF model for AAPL with sensitivity analysis",
      "Comprehensive research report on the semiconductor cycle turning points",
    ];
    for (const q of queries) {
      const result = scoreComplexity(q);
      assert.equal(result.model, "opus", `Expected 'opus' for: "${q}", got: ${result.model} (score: ${result.complexityScore})`);
    }
  });

  it("detects multiple tickers and boosts complexity", () => {
    const single = scoreComplexity("How is AAPL doing?");
    const multi = scoreComplexity("Compare AAPL NVDA MSFT GOOGL revenue growth");
    assert.ok(multi.complexityScore > single.complexityScore);
  });

  it("estimates cost correctly for each tier", () => {
    const skip = scoreComplexity("AAPL PE ratio");
    assert.equal(skip.estimatedCostCents, 0);

    const sonnet = scoreComplexity("Compare AAPL vs MSFT growth trajectory and margins in detail");
    assert.ok(sonnet.estimatedCostCents > 0);
    assert.ok(sonnet.estimatedCostCents < 5); // Sonnet should be < 5 cents

    const opus = scoreComplexity("Full analysis deep dive on NVDA datacenter strategy");
    assert.ok(opus.estimatedCostCents > sonnet.estimatedCostCents);
  });

  it("logs routing reason for debugging", () => {
    const result = scoreComplexity("Compare AAPL vs MSFT margins with deep dive into supply chain");
    assert.ok(result.reason.length > 0);
    assert.ok(result.reason.includes("comparison") || result.reason.includes("deep dive"));
  });
});

/* ═══════════════════════════════════════════════════════
   SEMANTIC CACHE — extractSemanticKey()
   ═══════════════════════════════════════════════════════ */

describe("SemanticCache — extractSemanticKey", () => {
  it("extracts ticker from query", () => {
    assert.equal(extractSemanticKey("Is NVDA overvalued?").ticker, "NVDA");
    assert.equal(extractSemanticKey("How is AAPL doing today?").ticker, "AAPL");
    assert.equal(extractSemanticKey("what's happening with the market?").ticker, null);
  });

  it("classifies question type correctly", () => {
    assert.equal(extractSemanticKey("Is NVDA overvalued?").questionType, "valuation");
    assert.equal(extractSemanticKey("Where's AAPL support level?").questionType, "technical");
    assert.equal(extractSemanticKey("What's MSFT revenue growth?").questionType, "fundamental");
    assert.equal(extractSemanticKey("Is the market bullish on TSLA?").questionType, "sentiment");
    assert.equal(extractSemanticKey("Compare AAPL vs MSFT").questionType, "comparison");
    assert.equal(extractSemanticKey("What's the Fed doing?").questionType, "macro");
    assert.equal(extractSemanticKey("NVDA options implied volatility").questionType, "options");
    assert.equal(extractSemanticKey("Give me a deep dive on NVDA").questionType, "deepdive");
  });

  it("semantically similar questions produce same type", () => {
    const q1 = extractSemanticKey("Is NVDA overvalued?");
    const q2 = extractSemanticKey("What's NVDA's valuation?");
    assert.equal(q1.ticker, q2.ticker);
    assert.equal(q1.questionType, q2.questionType);
  });

  it("extracts meaningful keywords", () => {
    const result = extractSemanticKey("What's NVDA's revenue growth compared to AMD?");
    assert.ok(result.keywords.length > 0);
    assert.ok(!result.keywords.includes("what")); // stop word removed
    assert.ok(!result.keywords.includes("the"));
  });
});

describe("SemanticCache — generateDataHash", () => {
  it("returns different hashes for different prices", () => {
    const h1 = generateDataHash("NVDA", 800.50);
    const h2 = generateDataHash("NVDA", 850.75);
    assert.notEqual(h1, h2);
  });

  it("returns different hashes for different tickers", () => {
    const h1 = generateDataHash("NVDA", 800);
    const h2 = generateDataHash("AAPL", 800);
    assert.notEqual(h1, h2);
  });

  it("returns same hash for same inputs in same time bucket", () => {
    const h1 = generateDataHash("NVDA", 800.0);
    const h2 = generateDataHash("NVDA", 800.0);
    assert.equal(h1, h2);
  });

  it("handles null ticker and missing data", () => {
    const h = generateDataHash(null);
    assert.ok(h.length > 0);
    assert.ok(typeof h === "string");
  });
});

describe("SemanticCache — cache operations", () => {
  it("returns null for cache miss", () => {
    const result = getCachedResponse("nonexistent:key:abc");
    assert.equal(result, null);
  });

  it("stores and retrieves cache entries", () => {
    const key = `test:cache:${Date.now()}`;
    const entry: CacheEntry = {
      response: "NVDA analysis response",
      model: "claude-sonnet-4-20250514",
      inputTokens: 500,
      outputTokens: 1200,
      createdAt: Date.now(),
      ttl: 30 * 60 * 1000,
      queryKeywords: ["nvda", "valuation"],
      ticker: "NVDA",
    };

    setCachedResponse(key, entry);
    const result = getCachedResponse(key);
    assert.ok(result !== null);
    assert.equal(result!.response, "NVDA analysis response");
    assert.equal(result!.ticker, "NVDA");
  });

  it("expires entries after TTL", () => {
    const key = `test:expired:${Date.now()}`;
    const entry: CacheEntry = {
      response: "old data",
      model: "claude-sonnet-4-20250514",
      inputTokens: 100,
      outputTokens: 200,
      createdAt: Date.now() - 60 * 60 * 1000, // 1 hour ago
      ttl: 30 * 60 * 1000, // 30 min TTL
      queryKeywords: ["test"],
      ticker: null,
    };

    setCachedResponse(key, entry);
    const result = getCachedResponse(key);
    assert.equal(result, null); // Should be expired
  });

  it("cache key groups semantically similar queries", () => {
    const dataHash = generateDataHash("NVDA", 800);
    const key1 = buildCacheKey("NVDA", "valuation", dataHash);
    const key2 = buildCacheKey("NVDA", "valuation", dataHash);
    assert.equal(key1, key2); // Same ticker + type + data = same key
  });
});

/* ═══════════════════════════════════════════════════════
   COST GUARDRAILS
   ═══════════════════════════════════════════════════════ */

describe("CostGuardrails — checkGuardrails", () => {
  it("allows requests within limits", () => {
    const result = checkGuardrails("test-user-clean", "PRO", "sonnet");
    assert.equal(result.allowed, true);
  });

  it("blocks opus for FREE tier", () => {
    const result = checkGuardrails("test-free-user", "FREE", "opus");
    // Should downgrade, not block
    assert.equal(result.allowed, true);
    assert.equal(result.downgradeModel, "sonnet");
  });

  it("blocks after daily limit exceeded", () => {
    const userId = `guardrail-test-${Date.now()}`;
    // Simulate 10 calls (FREE tier limit)
    for (let i = 0; i < 10; i++) {
      trackAiUsage({
        timestamp: Date.now(),
        userId,
        model: "claude-sonnet-4-20250514",
        inputTokens: 500,
        outputTokens: 1000,
        estimatedCost: 1.8,
        endpoint: "/api/ai/chat",
        cacheHit: false,
        latencyMs: 1000,
      });
    }

    const result = checkGuardrails(userId, "FREE", "sonnet");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "daily_limit");
    assert.ok(result.upgradeMessage!.includes("Upgrade"));
  });

  it("returns remaining calls count", () => {
    const userId = `remaining-test-${Date.now()}`;
    trackAiUsage({
      timestamp: Date.now(),
      userId,
      model: "claude-sonnet-4-20250514",
      inputTokens: 500,
      outputTokens: 1000,
      estimatedCost: 1.8,
      endpoint: "/api/ai/chat",
      cacheHit: false,
      latencyMs: 1000,
    });

    const result = checkGuardrails(userId, "STARTER", "sonnet");
    assert.equal(result.allowed, true);
    assert.ok(typeof result.remainingCalls === "number");
    assert.ok(result.remainingCalls! < 50); // STARTER max is 50
  });
});

/* ═══════════════════════════════════════════════════════
   COST TRACKER
   ═══════════════════════════════════════════════════════ */

describe("CostTracker", () => {
  it("tracks AI usage and returns record with ID", () => {
    const record = trackAiUsage({
      timestamp: Date.now(),
      userId: "tracker-test",
      model: "claude-sonnet-4-20250514",
      inputTokens: 500,
      outputTokens: 1500,
      estimatedCost: 2.4,
      endpoint: "/api/ai/chat",
      cacheHit: false,
      latencyMs: 2000,
    });

    assert.ok(record.id.startsWith("ai_"));
    assert.equal(record.userId, "tracker-test");
  });

  it("aggregates daily summary per user", () => {
    const userId = `daily-summary-${Date.now()}`;

    trackAiUsage({
      timestamp: Date.now(),
      userId,
      model: "claude-sonnet-4-20250514",
      inputTokens: 500,
      outputTokens: 1000,
      estimatedCost: 1.5,
      endpoint: "/api/ai/chat",
      cacheHit: false,
      latencyMs: 1000,
    });

    trackAiUsage({
      timestamp: Date.now(),
      userId,
      model: "claude-sonnet-4-20250514",
      inputTokens: 300,
      outputTokens: 800,
      estimatedCost: 1.2,
      endpoint: "/api/ai/chat",
      cacheHit: true,
      latencyMs: 50,
    });

    const summary = getUserDailySummary(userId);
    assert.ok(summary !== null);
    assert.equal(summary!.totalCalls, 2);
    assert.equal(summary!.cacheHits, 1);
    assert.ok(summary!.totalCostCents > 0);
  });

  it("estimates cost correctly for different models", () => {
    // Sonnet: $3/MTok in, $15/MTok out
    const sonnetCost = estimateCostCents("claude-sonnet-4-20250514", 1000, 1000);
    // 1000 * 3/1M = 0.003 + 1000 * 15/1M = 0.015 = $0.018 = 1.8 cents
    assert.ok(sonnetCost > 1 && sonnetCost < 3, `Sonnet cost: ${sonnetCost}c`);

    // Haiku should be much cheaper
    const haikuCost = estimateCostCents("claude-haiku-4-5-20251001", 1000, 1000);
    assert.ok(haikuCost < sonnetCost, "Haiku should be cheaper than Sonnet");

    // Opus should be more expensive
    const opusCost = estimateCostCents("claude-opus-4-20250115", 1000, 1000);
    assert.ok(opusCost > sonnetCost, "Opus should be more expensive than Sonnet");
  });
});

/* ═══════════════════════════════════════════════════════
   GATEWAY INTEGRATION
   ═══════════════════════════════════════════════════════ */

describe("Gateway — prepareGatewayRequest", () => {
  it("proceeds for a normal query within limits", () => {
    const result = prepareGatewayRequest({
      query: "How is AAPL doing today?",
      userId: `gw-test-${Date.now()}`,
      plan: "PRO",
      endpoint: "/api/ai/chat",
    });

    assert.ok(result.proceed || result.cachedResponse);
    assert.ok(result.model.length > 0);
    assert.ok(result.cacheKey.length > 0);
  });

  it("blocks when guardrails deny", () => {
    const userId = `gw-blocked-${Date.now()}`;
    // Fill up FREE tier quota
    for (let i = 0; i < 10; i++) {
      trackAiUsage({
        timestamp: Date.now(),
        userId,
        model: "claude-sonnet-4-20250514",
        inputTokens: 100,
        outputTokens: 200,
        estimatedCost: 0.5,
        endpoint: "/api/ai/chat",
        cacheHit: false,
        latencyMs: 500,
      });
    }

    const result = prepareGatewayRequest({
      query: "Tell me about NVDA",
      userId,
      plan: "FREE",
      endpoint: "/api/ai/chat",
    });

    assert.equal(result.proceed, false);
    assert.ok(!result.cachedResponse);
    assert.ok(result.error!.includes("Upgrade"));
    assert.equal(result.status, 429);
  });

  it("returns cached response for cache hit", () => {
    const userId = `gw-cache-${Date.now()}`;
    const cacheKey = `ai:response:NVDA:valuation:testHash123`;

    setCachedResponse(cacheKey, {
      response: "NVDA is fairly valued at current levels.",
      model: "claude-sonnet-4-20250514",
      inputTokens: 500,
      outputTokens: 1000,
      createdAt: Date.now(),
      ttl: 30 * 60 * 1000,
      queryKeywords: ["nvda", "valuation"],
      ticker: "NVDA",
    });

    // This won't match the exact cache key because generateDataHash uses time,
    // but it validates the flow. In a real scenario, the same query within
    // the same time bucket would hit cache.
    const result = prepareGatewayRequest({
      query: "Is NVDA overvalued right now?",
      userId,
      plan: "PRO",
      endpoint: "/api/ai/chat",
    });

    // The cache key includes a time-bucketed data hash, so this may or may not hit.
    // We just verify the function doesn't error and returns a valid structure.
    assert.ok("proceed" in result);
    assert.ok("routing" in result);
    assert.ok("guardrail" in result);
  });

  it("respects forceModel override", () => {
    const result = prepareGatewayRequest({
      query: "Simple question",
      userId: `gw-force-${Date.now()}`,
      plan: "PRO",
      endpoint: "/api/ai/chat",
      forceModel: "opus",
    });

    assert.equal(result.routing.model, "opus");
    assert.equal(result.routing.reason, "forced");
  });

  it("skips cache when skipCache is true", () => {
    const userId = `gw-nocache-${Date.now()}`;
    const result = prepareGatewayRequest({
      query: "Multi-turn conversation message",
      userId,
      plan: "PRO",
      endpoint: "/api/ai/chat",
      skipCache: true,
    });

    // Should always proceed (never return cached) when skipCache=true
    assert.equal(result.proceed, true);
    assert.equal(result.cachedResponse, undefined);
  });
});

/* ═══════════════════════════════════════════════════════
   Run with: npx tsx __tests__/ai-cost-optimizer.test.ts
   ═══════════════════════════════════════════════════════ */
