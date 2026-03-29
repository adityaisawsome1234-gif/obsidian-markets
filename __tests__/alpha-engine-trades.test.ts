/**
 * Unit tests for Personal Alpha Engine — Trade & Pattern Stats
 *
 * Run: npx tsx --test __tests__/alpha-engine-trades.test.ts
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createTrade,
  closeTrade,
  getTrade,
  listTrades,
  getOpenPositions,
  getRecentClosedTrades,
  getHoldingPeriodBucket,
  importTradesFromCsv,
  _resetTradeStore,
} from "../src/services/alpha-engine/trade.service";
import { computeAllPatternStats, generateInsights } from "../src/services/alpha-engine/pattern-stats.service";
import type { TradeCreateInput } from "../src/types/alpha-engine";

const USER_ID = "test_user";

function seedTrade(overrides?: Partial<TradeCreateInput>) {
  return createTrade(USER_ID, {
    symbol: "NVDA",
    side: "long",
    quantity: 100,
    entryPrice: 130,
    openedAt: new Date().toISOString(),
    strategyTag: "momentum",
    ...overrides,
  });
}

/* ═══════════════════════════════════════════════════════
   TRADE CRUD
   ═══════════════════════════════════════════════════════ */

describe("Trade Service — CRUD", () => {
  beforeEach(() => _resetTradeStore());

  it("creates a trade with all fields populated", () => {
    const trade = seedTrade();
    assert.ok(trade.id.startsWith("trade_"));
    assert.equal(trade.symbol, "NVDA");
    assert.equal(trade.side, "long");
    assert.equal(trade.quantity, 100);
    assert.equal(trade.entryPrice, 130);
    assert.equal(trade.status, "open");
    assert.equal(trade.exitPrice, null);
    assert.equal(trade.pnlPercent, null);
  });

  it("creates a closed trade with PnL computed", () => {
    const trade = seedTrade({
      exitPrice: 145,
      closedAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    });
    assert.equal(trade.status, "closed");
    assert.ok(trade.pnlPercent !== null);
    assert.ok(trade.pnlPercent! > 0, "Long trade with higher exit should have positive PnL");
    assert.ok(trade.holdingPeriodDays !== null);
  });

  it("closes an open trade correctly", () => {
    const open = seedTrade();
    assert.equal(open.status, "open");

    const closed = closeTrade(USER_ID, open.id, { exitPrice: 145 });
    assert.ok(closed !== null);
    assert.equal(closed!.status, "closed");
    assert.equal(closed!.exitPrice, 145);
    assert.ok(closed!.pnlPercent! > 0);
    assert.ok(closed!.pnlAbsolute! > 0);
  });

  it("computes short trade PnL correctly", () => {
    const trade = seedTrade({
      side: "short",
      entryPrice: 150,
      exitPrice: 140,
      closedAt: new Date().toISOString(),
    });
    assert.ok(trade.pnlPercent! > 0, "Short with lower exit should profit");
    assert.ok(trade.pnlAbsolute! > 0);
  });

  it("rejects closing an already-closed trade", () => {
    const trade = seedTrade({
      exitPrice: 145,
      closedAt: new Date().toISOString(),
    });
    const result = closeTrade(USER_ID, trade.id, { exitPrice: 150 });
    assert.equal(result, null);
  });

  it("rejects access from wrong user", () => {
    const trade = seedTrade();
    assert.equal(getTrade("other_user", trade.id), null);
    assert.equal(closeTrade("other_user", trade.id, { exitPrice: 145 }), null);
  });

  it("lists trades with filtering and pagination", () => {
    for (let i = 0; i < 5; i++) seedTrade({ symbol: "AAPL", strategyTag: "value" });
    for (let i = 0; i < 3; i++) seedTrade({ symbol: "NVDA", strategyTag: "momentum" });

    const { trades: all, total: allTotal } = listTrades(USER_ID);
    assert.equal(allTotal, 8);

    const { trades: nvda } = listTrades(USER_ID, { symbol: "NVDA" });
    assert.equal(nvda.length, 3);

    const { trades: value } = listTrades(USER_ID, { strategyTag: "value" });
    assert.equal(value.length, 5);

    const { trades: paginated } = listTrades(USER_ID, { limit: 3, offset: 0 });
    assert.equal(paginated.length, 3);
  });

  it("separates open vs closed positions", () => {
    seedTrade(); // open
    seedTrade(); // open
    seedTrade({ exitPrice: 145, closedAt: new Date().toISOString() }); // closed

    const open = getOpenPositions(USER_ID);
    assert.equal(open.length, 2);
  });
});

/* ═══════════════════════════════════════════════════════
   CSV IMPORT
   ═══════════════════════════════════════════════════════ */

describe("Trade Service — CSV Import", () => {
  beforeEach(() => _resetTradeStore());

  it("imports valid rows", () => {
    const rows = [
      { symbol: "AAPL", entry_price: "150.00", quantity: "50", side: "long", opened_at: "2026-01-15", strategy_tag: "value" },
      { symbol: "MSFT", entry_price: "400.00", quantity: "25", side: "long", opened_at: "2026-01-20", strategy_tag: "momentum" },
    ];

    const result = importTradesFromCsv(USER_ID, rows);
    assert.equal(result.imported, 2);
    assert.equal(result.errors.length, 0);

    const { total } = listTrades(USER_ID);
    assert.equal(total, 2);
  });

  it("skips invalid rows and reports errors", () => {
    const rows = [
      { symbol: "", entry_price: "150.00", quantity: "50" }, // missing symbol
      { symbol: "AAPL", entry_price: "-1", quantity: "50" }, // negative price
      { symbol: "AAPL", entry_price: "150", quantity: "0" }, // zero quantity
      { symbol: "AAPL", entry_price: "150", quantity: "50", side: "long" }, // valid
    ];

    const result = importTradesFromCsv(USER_ID, rows);
    assert.equal(result.imported, 1);
    assert.equal(result.errors.length, 3);
  });
});

/* ═══════════════════════════════════════════════════════
   HOLDING PERIOD BUCKETS
   ═══════════════════════════════════════════════════════ */

describe("Holding Period Buckets", () => {
  it("classifies intraday", () => assert.equal(getHoldingPeriodBucket(0), "intraday"));
  it("classifies swing 1-3d", () => assert.equal(getHoldingPeriodBucket(2), "swing_1_3d"));
  it("classifies swing 4-7d", () => assert.equal(getHoldingPeriodBucket(5), "swing_4_7d"));
  it("classifies position 1-4w", () => assert.equal(getHoldingPeriodBucket(14), "position_1_4w"));
  it("classifies long term", () => assert.equal(getHoldingPeriodBucket(60), "long_term"));
});

/* ═══════════════════════════════════════════════════════
   PATTERN STATS
   ═══════════════════════════════════════════════════════ */

describe("Pattern Stats", () => {
  beforeEach(() => _resetTradeStore());

  it("computes stats grouped by strategy", () => {
    for (let i = 0; i < 5; i++) {
      seedTrade({
        strategyTag: "momentum",
        exitPrice: 130 + (i % 3 === 0 ? -5 : 10),
        closedAt: new Date(Date.now() - i * 86400000).toISOString(),
      });
    }
    for (let i = 0; i < 3; i++) {
      seedTrade({
        strategyTag: "value",
        exitPrice: 120,
        closedAt: new Date(Date.now() - i * 86400000).toISOString(),
      });
    }

    const allClosed = listTrades(USER_ID, { status: "closed" }).trades;
    const stats = computeAllPatternStats(allClosed);

    const momentum = stats.find(s => s.groupType === "strategy_tag" && s.groupValue === "momentum");
    assert.ok(momentum, "Should have momentum stats");
    assert.equal(momentum!.sampleSize, 5);
    assert.ok(momentum!.winRate >= 0 && momentum!.winRate <= 1);

    const value = stats.find(s => s.groupType === "strategy_tag" && s.groupValue === "value");
    assert.ok(value, "Should have value stats");
    assert.equal(value!.sampleSize, 3);
  });

  it("computes profit factor correctly", () => {
    // 3 winners, 1 loser
    seedTrade({ exitPrice: 140, closedAt: new Date().toISOString(), strategyTag: "breakout" });
    seedTrade({ exitPrice: 145, closedAt: new Date().toISOString(), strategyTag: "breakout" });
    seedTrade({ exitPrice: 135, closedAt: new Date().toISOString(), strategyTag: "breakout" });
    seedTrade({ exitPrice: 120, closedAt: new Date().toISOString(), strategyTag: "breakout" });

    const allClosed = listTrades(USER_ID, { status: "closed" }).trades;
    const stats = computeAllPatternStats(allClosed);
    const breakout = stats.find(s => s.groupType === "strategy_tag" && s.groupValue === "breakout");
    assert.ok(breakout);
    assert.ok(breakout!.profitFactor > 1, "Profit factor should be > 1 with more win $ than loss $");
    assert.equal(breakout!.winRate, 0.75);
  });
});

/* ═══════════════════════════════════════════════════════
   BEHAVIORAL INSIGHTS
   ═══════════════════════════════════════════════════════ */

describe("Behavioral Insights", () => {
  beforeEach(() => _resetTradeStore());

  it("generates strength insight for strong setup", () => {
    for (let i = 0; i < 6; i++) {
      seedTrade({
        strategyTag: "momentum",
        exitPrice: 145, // always win
        closedAt: new Date(Date.now() - i * 86400000).toISOString(),
      });
    }

    const allClosed = listTrades(USER_ID, { status: "closed" }).trades;
    const stats = computeAllPatternStats(allClosed);
    const insights = generateInsights(stats, allClosed);

    const strength = insights.find(i => i.category === "strength");
    assert.ok(strength, "Should find a strength insight");
    assert.ok(strength!.message.includes("momentum") || strength!.message.includes("Momentum"),
      "Strength should mention the strong setup");
  });

  it("generates warning for losing streak", () => {
    for (let i = 0; i < 5; i++) {
      seedTrade({
        exitPrice: 115, // all losses
        closedAt: new Date(Date.now() - i * 86400000).toISOString(),
      });
    }

    const allClosed = listTrades(USER_ID, { status: "closed" }).trades;
    const stats = computeAllPatternStats(allClosed);
    const insights = generateInsights(stats, allClosed);

    const warning = insights.find(i => i.category === "warning");
    assert.ok(warning, "Should warn about losing streak");
  });

  it("returns empty insights with insufficient data", () => {
    seedTrade({
      exitPrice: 140,
      closedAt: new Date().toISOString(),
    });

    const allClosed = listTrades(USER_ID, { status: "closed" }).trades;
    const stats = computeAllPatternStats(allClosed);
    const insights = generateInsights(stats, allClosed);

    // With only 1 trade, no meaningful insights can be generated
    const strength = insights.find(i => i.category === "strength");
    assert.equal(strength, undefined, "Should not produce strength insight with 1 trade");
  });
});
