/**
 * Portfolio-Aware AI Engine
 *
 * The key differentiator: our AI doesn't summarize the market —
 * it tells you what the market means for YOUR specific positions.
 */

import type { PortfolioHolding } from "@/types/portfolio";

/* ── Types ── */

export interface EnrichedHolding {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  weight: number;
  dayChangePercent: number;
  sector: string;
  beta: number;
  peRatio: number | null;
  earningsDate: string | null;
  daysToEarnings: number | null;
  ma50: number | null;
  ma200: number | null;
}

export interface PortfolioContext {
  generatedAt: string;
  totalValue: number;
  totalCostBasis: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  holdings: EnrichedHolding[];
  sectorConcentration: { sector: string; weight: number; isRisky: boolean }[];
  upcomingEarnings: { ticker: string; date: string; daysAway: number }[];
  riskMetrics: {
    portfolioBeta: number;
    var95: number;
    var95Percent: number;
    correlationMatrix: { tickers: string[]; matrix: number[][] };
  };
}

export interface PortfolioAlert {
  id: string;
  type:
    | "large_move"
    | "earnings_approaching"
    | "sector_concentration"
    | "technical_break"
    | "correlation_risk";
  severity: "high" | "medium" | "low";
  ticker: string | null;
  title: string;
  data: Record<string, unknown>;
}

export interface ScanResult {
  alerts: PortfolioAlert[];
  scannedAt: string;
}

/* ── In-memory cache ── */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const contextCache = new Map<string, CacheEntry<PortfolioContext>>();
const CONTEXT_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/* ── Sector mapping ── */

const SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology", NVDA: "Technology", MSFT: "Technology", GOOGL: "Technology",
  AMZN: "Consumer Discretionary", META: "Technology", TSLA: "Consumer Discretionary",
  AMD: "Technology", INTC: "Technology", CRM: "Technology", ORCL: "Technology",
  JPM: "Financials", BAC: "Financials", GS: "Financials", V: "Financials",
  MA: "Financials", BRK: "Financials",
  UNH: "Healthcare", JNJ: "Healthcare", PFE: "Healthcare", ABBV: "Healthcare",
  LLY: "Healthcare", MRK: "Healthcare",
  XOM: "Energy", CVX: "Energy", COP: "Energy",
  PG: "Consumer Staples", KO: "Consumer Staples", PEP: "Consumer Staples",
  WMT: "Consumer Staples", COST: "Consumer Staples",
  DIS: "Communication Services", NFLX: "Communication Services",
  CAT: "Industrials", BA: "Industrials", HON: "Industrials", UPS: "Industrials",
  SPY: "Broad Market", QQQ: "Technology", IWM: "Broad Market",
};

function getSector(ticker: string): string {
  return SECTOR_MAP[ticker.toUpperCase()] || "Other";
}

/* ── Math utilities ── */

/** Normal CDF approximation (Abramowitz & Stegun) */
function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Compute Pearson correlation between two return series.
 */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  const denom = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (denom === 0) return 0;
  return (n * sumAB - sumA * sumB) / denom;
}

/**
 * Compute daily returns from a price series.
 */
function dailyReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return returns;
}

/**
 * Parametric VaR at given confidence level (1-day).
 * Uses portfolio weighted standard deviation.
 */
export function computeVaR(
  weights: number[],
  covMatrix: number[][],
  portfolioValue: number,
  confidence: number = 0.95
): number {
  const n = weights.length;
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVariance += weights[i] * weights[j] * (covMatrix[i]?.[j] ?? 0);
    }
  }
  const portfolioStdDev = Math.sqrt(Math.max(0, portfolioVariance));
  // z-score for confidence level
  const zScore = confidence === 0.99 ? 2.326 : confidence === 0.95 ? 1.645 : 1.282;
  return portfolioStdDev * zScore * portfolioValue;
}

/**
 * Build covariance matrix from daily return series.
 */
function buildCovMatrix(returnSeries: number[][]): number[][] {
  const n = returnSeries.length;
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const ri = returnSeries[i];
      const rj = returnSeries[j];
      const len = Math.min(ri.length, rj.length);
      if (len < 2) continue;
      const meanI = ri.reduce((s, v) => s + v, 0) / len;
      const meanJ = rj.reduce((s, v) => s + v, 0) / len;
      let sum = 0;
      for (let k = 0; k < len; k++) {
        sum += (ri[k] - meanI) * (rj[k] - meanJ);
      }
      const val = sum / (len - 1);
      cov[i][j] = val;
      cov[j][i] = val;
    }
  }
  return cov;
}

/* ── Data Fetching ── */

interface StockQuoteData {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  chartData?: { close: number }[];
}

async function fetchStockQuote(
  ticker: string,
  baseUrl: string
): Promise<StockQuoteData | null> {
  try {
    const res = await fetch(`${baseUrl}/api/stock/${ticker}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface StockProfileData {
  profile?: {
    sector?: string;
    beta?: number;
  };
  ratios?: {
    peRatioTTM?: number;
  };
  earnings?: Array<{ date?: string; fiscalDateEnding?: string }>;
}

async function fetchStockProfile(
  ticker: string,
  baseUrl: string
): Promise<StockProfileData | null> {
  try {
    const res = await fetch(`${baseUrl}/api/stock/${ticker}/profile`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ── PortfolioContext Builder ── */

export async function buildPortfolioContext(
  holdings: PortfolioHolding[],
  userId: string = "default"
): Promise<PortfolioContext> {
  // Check cache first
  const cached = getCached(contextCache, userId);
  if (cached) return cached;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const now = new Date();

  // Fetch live data for all holdings in parallel
  const [quotes, profiles] = await Promise.all([
    Promise.all(holdings.map((h) => fetchStockQuote(h.ticker, baseUrl))),
    Promise.all(holdings.map((h) => fetchStockProfile(h.ticker, baseUrl))),
  ]);

  // Enrich holdings
  const enriched: EnrichedHolding[] = holdings.map((h, i) => {
    const quote = quotes[i];
    const profile = profiles[i];
    const currentPrice = quote?.price ?? h.currentPrice;
    const marketValue = currentPrice * h.shares;
    const costBasis = h.avgCost * h.shares;

    // Find next earnings
    let earningsDate: string | null = null;
    let daysToEarnings: number | null = null;
    if (profile?.earnings) {
      for (const e of profile.earnings) {
        const dateStr = e.date || e.fiscalDateEnding;
        if (!dateStr) continue;
        const eDate = new Date(dateStr);
        const diff = Math.ceil((eDate.getTime() - now.getTime()) / 86400000);
        if (diff >= 0 && diff <= 90) {
          earningsDate = dateStr;
          daysToEarnings = diff;
          break;
        }
      }
    }

    return {
      ticker: h.ticker,
      name: h.name,
      shares: h.shares,
      avgCost: h.avgCost,
      currentPrice,
      marketValue,
      costBasis,
      unrealizedPL: marketValue - costBasis,
      unrealizedPLPercent: costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0,
      weight: 0, // computed below
      dayChangePercent: quote?.changePercent ?? h.dayChangePercent,
      sector: profile?.profile?.sector || getSector(h.ticker),
      beta: profile?.profile?.beta ?? 1.0,
      peRatio: profile?.ratios?.peRatioTTM ?? null,
      earningsDate,
      daysToEarnings,
      ma50: quote?.fiftyDayAverage ?? null,
      ma200: quote?.twoHundredDayAverage ?? null,
    };
  });

  const totalValue = enriched.reduce((s, h) => s + h.marketValue, 0);
  const totalCostBasis = enriched.reduce((s, h) => s + h.costBasis, 0);

  // Compute weights
  for (const h of enriched) {
    h.weight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
  }

  // Sector concentration
  const sectorMap = new Map<string, number>();
  for (const h of enriched) {
    sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + h.weight);
  }
  const sectorConcentration = Array.from(sectorMap.entries())
    .map(([sector, weight]) => ({ sector, weight: Math.round(weight * 10) / 10, isRisky: weight > 40 }))
    .sort((a, b) => b.weight - a.weight);

  // Upcoming earnings (next 14 days)
  const upcomingEarnings = enriched
    .filter((h) => h.daysToEarnings !== null && h.daysToEarnings <= 14)
    .map((h) => ({ ticker: h.ticker, date: h.earningsDate!, daysAway: h.daysToEarnings! }))
    .sort((a, b) => a.daysAway - b.daysAway);

  // Correlation matrix + VaR using daily returns from chart data
  const returnSeries: number[][] = [];
  const tickers: string[] = [];
  for (let i = 0; i < enriched.length; i++) {
    const chartData = quotes[i]?.chartData;
    if (chartData && chartData.length > 5) {
      const prices = chartData.map((d) => d.close);
      returnSeries.push(dailyReturns(prices));
      tickers.push(enriched[i].ticker);
    }
  }

  // Compute correlation matrix
  const correlationMatrix: number[][] = [];
  for (let i = 0; i < returnSeries.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < returnSeries.length; j++) {
      row.push(i === j ? 1.0 : pearsonCorrelation(returnSeries[i], returnSeries[j]));
    }
    correlationMatrix.push(row);
  }

  // Compute covariance matrix and VaR
  const covMatrix = buildCovMatrix(returnSeries);
  const weights = tickers.map((t) => {
    const h = enriched.find((e) => e.ticker === t);
    return h ? h.weight / 100 : 0;
  });
  const var95 = returnSeries.length > 0
    ? computeVaR(weights, covMatrix, totalValue, 0.95)
    : totalValue * 0.02; // fallback: ~2% of portfolio

  // Portfolio beta (weighted average)
  const portfolioBeta = enriched.reduce((s, h) => s + h.beta * (h.weight / 100), 0);

  const ctx: PortfolioContext = {
    generatedAt: now.toISOString(),
    totalValue,
    totalCostBasis,
    totalUnrealizedPL: totalValue - totalCostBasis,
    totalUnrealizedPLPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
    holdings: enriched,
    sectorConcentration,
    upcomingEarnings,
    riskMetrics: {
      portfolioBeta: Math.round(portfolioBeta * 100) / 100,
      var95: Math.round(var95),
      var95Percent: totalValue > 0 ? Math.round((var95 / totalValue) * 10000) / 100 : 0,
      correlationMatrix: { tickers, matrix: correlationMatrix },
    },
  };

  setCache(contextCache, userId, ctx, CONTEXT_TTL);
  return ctx;
}

/* ── Portfolio Event Scanner ── */

export function scanPortfolioEvents(ctx: PortfolioContext): ScanResult {
  const alerts: PortfolioAlert[] = [];
  let alertId = 0;

  for (const h of ctx.holdings) {
    // Large move (> 2% in a day as simplified 2-sigma proxy)
    if (Math.abs(h.dayChangePercent) > 2) {
      const direction = h.dayChangePercent > 0 ? "up" : "down";
      const impact = h.dayChangePercent * h.marketValue / 100;
      alerts.push({
        id: `alert-${++alertId}`,
        type: "large_move",
        severity: Math.abs(h.dayChangePercent) > 5 ? "high" : "medium",
        ticker: h.ticker,
        title: `${h.ticker} ${direction} ${Math.abs(h.dayChangePercent).toFixed(1)}% today`,
        data: {
          changePercent: h.dayChangePercent,
          dollarImpact: Math.round(impact),
          weight: h.weight,
          unrealizedPL: h.unrealizedPL,
        },
      });
    }

    // Earnings approaching (48 hours)
    if (h.daysToEarnings !== null && h.daysToEarnings <= 2) {
      alerts.push({
        id: `alert-${++alertId}`,
        type: "earnings_approaching",
        severity: h.weight > 10 ? "high" : "medium",
        ticker: h.ticker,
        title: `${h.ticker} earnings in ${h.daysToEarnings === 0 ? "today" : h.daysToEarnings === 1 ? "tomorrow" : `${h.daysToEarnings} days`}`,
        data: {
          earningsDate: h.earningsDate,
          daysAway: h.daysToEarnings,
          weight: h.weight,
          unrealizedPL: h.unrealizedPL,
          positionSize: h.marketValue,
        },
      });
    }

    // Technical break (price vs 50/200 DMA)
    if (h.ma200 && h.currentPrice > 0) {
      const crossedAbove200 = h.currentPrice > h.ma200 && h.currentPrice / h.ma200 < 1.02;
      const crossedBelow200 = h.currentPrice < h.ma200 && h.currentPrice / h.ma200 > 0.98;
      if (crossedAbove200 || crossedBelow200) {
        alerts.push({
          id: `alert-${++alertId}`,
          type: "technical_break",
          severity: "medium",
          ticker: h.ticker,
          title: `${h.ticker} ${crossedAbove200 ? "crossed above" : "broke below"} 200-day MA`,
          data: {
            currentPrice: h.currentPrice,
            ma200: h.ma200,
            direction: crossedAbove200 ? "bullish" : "bearish",
          },
        });
      }
    }
  }

  // Sector concentration risk
  for (const sc of ctx.sectorConcentration) {
    if (sc.isRisky) {
      alerts.push({
        id: `alert-${++alertId}`,
        type: "sector_concentration",
        severity: sc.weight > 60 ? "high" : "medium",
        ticker: null,
        title: `${sc.sector} sector is ${sc.weight.toFixed(0)}% of portfolio`,
        data: {
          sector: sc.sector,
          weight: sc.weight,
          threshold: 40,
        },
      });
    }
  }

  // High correlation risk (any pair > 0.85)
  const { tickers, matrix } = ctx.riskMetrics.correlationMatrix;
  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      if (matrix[i]?.[j] > 0.85) {
        alerts.push({
          id: `alert-${++alertId}`,
          type: "correlation_risk",
          severity: "low",
          ticker: null,
          title: `${tickers[i]} and ${tickers[j]} are highly correlated (${(matrix[i][j] * 100).toFixed(0)}%)`,
          data: {
            pair: [tickers[i], tickers[j]],
            correlation: Math.round(matrix[i][j] * 100) / 100,
          },
        });
      }
    }
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { alerts, scannedAt: new Date().toISOString() };
}

/* ── Alert Prompt Builder ── */

export function buildAlertPrompt(
  alert: PortfolioAlert,
  ctx: PortfolioContext
): string {
  const holding = alert.ticker
    ? ctx.holdings.find((h) => h.ticker === alert.ticker)
    : null;

  let positionContext = "";
  if (holding) {
    positionContext = `Position: ${holding.shares} shares of ${holding.ticker} (${holding.name}). Cost basis: $${holding.avgCost.toFixed(2)}/share ($${holding.costBasis.toLocaleString()} total). Current: $${holding.currentPrice.toFixed(2)}/share ($${holding.marketValue.toLocaleString()} total). Unrealized P&L: ${holding.unrealizedPL >= 0 ? "+" : ""}$${holding.unrealizedPL.toLocaleString()} (${holding.unrealizedPLPercent >= 0 ? "+" : ""}${holding.unrealizedPLPercent.toFixed(1)}%). Portfolio weight: ${holding.weight.toFixed(1)}%.`;
  }

  const portfolioContext = `Portfolio total: $${ctx.totalValue.toLocaleString()}. Total unrealized P&L: ${ctx.totalUnrealizedPL >= 0 ? "+" : ""}$${ctx.totalUnrealizedPL.toLocaleString()} (${ctx.totalUnrealizedPLPercent.toFixed(1)}%). Beta: ${ctx.riskMetrics.portfolioBeta}. 1-day VaR (95%): $${ctx.riskMetrics.var95.toLocaleString()}.`;

  return `You are Obsidian AI, a portfolio risk analyst. Generate a 2-3 sentence personalized alert for the following event.

EVENT TYPE: ${alert.type}
EVENT: ${alert.title}
EVENT DATA: ${JSON.stringify(alert.data)}

${positionContext}

${portfolioContext}

RULES:
- NEVER give investment advice or recommendations to buy/sell
- Never use phrases like "you should", "I recommend", "consider buying/selling"
- Never present predictions as certainties — use "data suggests", "historically"
- Only surface risk and context — let the user decide
- Include specific dollar amounts and percentages in every sentence
- Be direct and concise — no filler, no hedging
- If concentration risk, explain WHY it matters (correlation, single-event risk)
- Reference the user's actual P&L and position size`;
}
