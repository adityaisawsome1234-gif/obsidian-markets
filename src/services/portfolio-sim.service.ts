/**
 * Portfolio Impact Simulator
 *
 * Parses natural language "what if" queries, applies scenarios to
 * the user's actual portfolio, and returns before/after comparisons.
 */

import type { PortfolioHolding } from "@/types/portfolio";

/* ── Types ── */

export interface SimScenario {
  action: "price_change" | "buy" | "sell" | "add_position" | "market_crash";
  ticker: string | null; // null = all holdings
  parameter: number; // percent for price_change/market_crash, shares for buy/sell
  description: string;
}

export interface PortfolioSnapshot {
  totalValue: number;
  holdings: {
    ticker: string;
    name: string;
    shares: number;
    price: number;
    value: number;
    weight: number;
    sector: string;
  }[];
  sectorAllocation: { sector: string; weight: number }[];
  beta: number;
  maxConcentration: { ticker: string; weight: number };
  var95: number;
}

export interface SimResult {
  scenario: SimScenario;
  before: PortfolioSnapshot;
  after: PortfolioSnapshot;
  delta: {
    totalValue: number;
    totalValuePercent: number;
    betaChange: number;
    maxConcentrationChange: number;
    var95Change: number;
  };
}

/* ── Sector mapping (same as portfolio-ai) ── */

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", NVDA: "Technology", MSFT: "Technology", GOOGL: "Technology",
  META: "Technology", AMD: "Technology", INTC: "Technology", CRM: "Technology",
  AMZN: "Consumer Discretionary", TSLA: "Consumer Discretionary",
  JPM: "Financials", BAC: "Financials", GS: "Financials", V: "Financials",
  MA: "Financials",
  UNH: "Healthcare", JNJ: "Healthcare", PFE: "Healthcare", LLY: "Healthcare",
  XOM: "Energy", CVX: "Energy",
  PG: "Consumer Staples", KO: "Consumer Staples", WMT: "Consumer Staples",
  DIS: "Communication Services", NFLX: "Communication Services",
  CAT: "Industrials", BA: "Industrials",
  SPY: "Broad Market", QQQ: "Technology",
};

function getSector(ticker: string): string {
  return SECTOR_MAP[ticker.toUpperCase()] || "Other";
}

/* ── Beta estimates ── */

const BETA_MAP: Record<string, number> = {
  AAPL: 1.2, NVDA: 1.7, MSFT: 1.1, GOOGL: 1.15, AMZN: 1.25,
  META: 1.3, TSLA: 2.0, AMD: 1.8, JPM: 1.05, BAC: 1.15,
  V: 0.95, MA: 1.0, UNH: 0.75, JNJ: 0.65, XOM: 0.9,
};

function getBeta(ticker: string): number {
  return BETA_MAP[ticker.toUpperCase()] || 1.0;
}

/* ── Snapshot builder ── */

function buildSnapshot(holdings: { ticker: string; name: string; shares: number; price: number; sector: string }[]): PortfolioSnapshot {
  const items = holdings.map((h) => ({
    ...h,
    value: h.shares * h.price,
    weight: 0,
  }));

  const totalValue = items.reduce((s, h) => s + h.value, 0);

  for (const h of items) {
    h.weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
  }

  // Sector allocation
  const sectorMap = new Map<string, number>();
  for (const h of items) {
    sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + h.weight);
  }
  const sectorAllocation = Array.from(sectorMap.entries())
    .map(([sector, weight]) => ({ sector, weight: Math.round(weight * 10) / 10 }))
    .sort((a, b) => b.weight - a.weight);

  // Beta (weighted average)
  const beta = items.reduce((s, h) => s + getBeta(h.ticker) * (h.weight / 100), 0);

  // Max concentration
  const maxConc = items.reduce(
    (max, h) => (h.weight > max.weight ? { ticker: h.ticker, weight: h.weight } : max),
    { ticker: "", weight: 0 }
  );

  // Simplified VaR: portfolio_std ≈ beta * market_daily_std * value
  // Using ~1% daily market std dev, 1.645 z-score for 95%
  const var95 = Math.round(beta * 0.01 * 1.645 * totalValue);

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    holdings: items.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      shares: h.shares,
      price: Math.round(h.price * 100) / 100,
      value: Math.round(h.value * 100) / 100,
      weight: Math.round(h.weight * 10) / 10,
      sector: h.sector,
    })),
    sectorAllocation,
    beta: Math.round(beta * 100) / 100,
    maxConcentration: {
      ticker: maxConc.ticker,
      weight: Math.round(maxConc.weight * 10) / 10,
    },
    var95,
  };
}

/* ── Apply scenario ── */

export function applyScenario(
  holdings: PortfolioHolding[],
  scenario: SimScenario
): SimResult {
  // Build before state
  const beforeItems = holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    shares: h.shares,
    price: h.currentPrice,
    sector: getSector(h.ticker),
  }));
  const before = buildSnapshot(beforeItems);

  // Apply scenario to get after state
  let afterItems = beforeItems.map((h) => ({ ...h }));

  switch (scenario.action) {
    case "price_change": {
      const pct = scenario.parameter / 100;
      if (scenario.ticker) {
        const target = scenario.ticker.toUpperCase();
        afterItems = afterItems.map((h) =>
          h.ticker.toUpperCase() === target
            ? { ...h, price: h.price * (1 + pct) }
            : h
        );
      } else {
        afterItems = afterItems.map((h) => ({
          ...h,
          price: h.price * (1 + pct),
        }));
      }
      break;
    }

    case "market_crash": {
      const pct = scenario.parameter / 100;
      afterItems = afterItems.map((h) => {
        const beta = getBeta(h.ticker);
        return { ...h, price: h.price * (1 + pct * beta) };
      });
      break;
    }

    case "sell": {
      const target = scenario.ticker?.toUpperCase();
      if (target) {
        afterItems = afterItems.map((h) => {
          if (h.ticker.toUpperCase() !== target) return h;
          const newShares = Math.max(0, h.shares - Math.abs(scenario.parameter));
          return { ...h, shares: newShares };
        }).filter((h) => h.shares > 0);
      }
      break;
    }

    case "buy": {
      const target = scenario.ticker?.toUpperCase();
      if (target) {
        const existing = afterItems.find(
          (h) => h.ticker.toUpperCase() === target
        );
        if (existing) {
          existing.shares += Math.abs(scenario.parameter);
        }
        // If not in portfolio, we'd need a price — skip for now
      }
      break;
    }

    case "add_position": {
      // parameter = dollar amount, ticker required
      // Not implemented in detail — treated as buy at current price
      break;
    }
  }

  const after = buildSnapshot(afterItems);

  return {
    scenario,
    before,
    after,
    delta: {
      totalValue: Math.round((after.totalValue - before.totalValue) * 100) / 100,
      totalValuePercent:
        before.totalValue > 0
          ? Math.round(((after.totalValue - before.totalValue) / before.totalValue) * 10000) / 100
          : 0,
      betaChange: Math.round((after.beta - before.beta) * 100) / 100,
      maxConcentrationChange:
        Math.round((after.maxConcentration.weight - before.maxConcentration.weight) * 10) / 10,
      var95Change: after.var95 - before.var95,
    },
  };
}

/* ── Prompt builder for Claude scenario extraction ── */

export function buildExtractionPrompt(
  query: string,
  tickers: string[]
): string {
  return `You are a financial scenario parser. Given a user's natural language question about their portfolio, extract the scenario as structured JSON.

The user's portfolio contains these tickers: ${tickers.join(", ")}

RULES:
- For price changes like "what if NVDA drops 15%", use action "price_change" with parameter -15
- For selling like "what if I sell half my AAPL" (they own shares), use action "sell" with parameter = shares to sell
- For broad market events like "2008-style crash" or "recession", use action "market_crash" with parameter as the broad market percentage (e.g. -38 for 2008)
- For "what if rates go up 1%", apply price_change of roughly -5% to all holdings (rate sensitivity)
- ticker should be null if the scenario applies to all holdings
- parameter is always a number (percent for price_change/market_crash, shares for buy/sell)
- description is a one-line human-readable description of the scenario

USER QUERY: "${query}"

Respond with ONLY valid JSON, no markdown, no explanation:
{"action": "...", "ticker": "..." or null, "parameter": ..., "description": "..."}`;
}

/* ── Prompt builder for Claude summary ── */

export function buildSummaryPrompt(
  query: string,
  result: SimResult
): string {
  const { before, after, delta, scenario } = result;

  return `You are Obsidian AI, a portfolio risk analyst. A user asked: "${query}"

Scenario applied: ${scenario.description}

BEFORE:
- Portfolio value: $${before.totalValue.toLocaleString()}
- Beta: ${before.beta}
- Max concentration: ${before.maxConcentration.ticker} at ${before.maxConcentration.weight}%
- VaR (95%, 1-day): $${before.var95.toLocaleString()}
- Sector breakdown: ${before.sectorAllocation.map((s) => `${s.sector} ${s.weight}%`).join(", ")}

AFTER:
- Portfolio value: $${after.totalValue.toLocaleString()}
- Beta: ${after.beta}
- Max concentration: ${after.maxConcentration.ticker} at ${after.maxConcentration.weight}%
- VaR (95%, 1-day): $${after.var95.toLocaleString()}
- Sector breakdown: ${after.sectorAllocation.map((s) => `${s.sector} ${s.weight}%`).join(", ")}

CHANGE:
- Value: ${delta.totalValue >= 0 ? "+" : ""}$${delta.totalValue.toLocaleString()} (${delta.totalValuePercent >= 0 ? "+" : ""}${delta.totalValuePercent}%)
- Beta: ${delta.betaChange >= 0 ? "+" : ""}${delta.betaChange}
- VaR: ${delta.var95Change >= 0 ? "+" : ""}$${delta.var95Change.toLocaleString()}

Write a 2-4 sentence analysis. Be specific with dollar amounts and percentages. Explain WHY (beta amplification, sector concentration, correlation). Never give advice — only surface risk and context. Never say "you should", "I recommend", or "consider buying/selling". Use hedging language for forward-looking statements: "data suggests", "historically". Be direct and punchy, no filler.`;
}
