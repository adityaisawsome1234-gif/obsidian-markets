import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/options/flow/smart
 *
 * Returns today's classified options flow ranked by smart money score,
 * with AI-generated narratives for the top anomalies.
 *
 * Data source: options_flow_classified + options_flow_anomalies tables
 * populated by the Python options intelligence pipeline.
 *
 * Query params:
 *   - limit (default 50, max 200)
 *   - minScore (default 0, filter by minimum smart money score)
 *   - direction (BULLISH | BEARISH | all)
 *   - ticker (filter by specific ticker)
 *
 * Falls back to synthetic demo data when database is unavailable.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") || "50", 10), 200);
  const minScore = parseInt(sp.get("minScore") || "0", 10);
  const direction = sp.get("direction") || "all";
  const ticker = sp.get("ticker")?.toUpperCase() || null;

  try {
    // Try backend DB first
    const dbData = await fetchFromBackend(limit, minScore, direction, ticker);
    if (dbData) {
      return NextResponse.json(dbData, {
        headers: {
          "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
          "X-Data-Source": "proprietary-flow-pipeline",
        },
      });
    }

    // Fallback: demo data
    return NextResponse.json(buildDemoSmartFlow(limit, minScore, direction, ticker), {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        "X-Data-Source": "demo",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch smart flow" }, { status: 500 });
  }
}

async function fetchFromBackend(
  limit: number, minScore: number, direction: string, ticker: string | null
): Promise<SmartFlowResponse | null> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  try {
    const params = new URLSearchParams({ limit: String(limit), minScore: String(minScore) });
    if (direction !== "all") params.set("direction", direction);
    if (ticker) params.set("ticker", ticker);

    const resp = await fetch(
      `${backendUrl}/api/options/flow/smart?${params}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function buildDemoSmartFlow(
  limit: number, minScore: number, direction: string, filterTicker: string | null
): SmartFlowResponse {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const TICKERS = ["NVDA", "AAPL", "TSLA", "AMD", "META", "MSFT", "SPY", "QQQ", "AMZN", "JPM"];
  const PRICES: Record<string, number> = {
    NVDA: 878, AAPL: 189, TSLA: 248, AMD: 165, META: 505,
    MSFT: 417, SPY: 525, QQQ: 452, AMZN: 186, JPM: 198,
  };

  // Generate demo trades ranked by score
  const trades: SmartFlowTrade[] = [
    { ticker: "NVDA", strike: 900, expiry: daysOut(14), callPut: "C", premium: 2340000, size: 520, price: 45.00, classification: "SWEEP", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 92, underlyingPrice: 878, time: hoursAgo(now, 0.5) },
    { ticker: "TSLA", strike: 260, expiry: daysOut(7), callPut: "P", premium: 1850000, size: 380, price: 48.68, classification: "BLOCK", atBidAsk: "ASK", direction: "BEARISH", smartMoneyScore: 88, underlyingPrice: 248, time: hoursAgo(now, 1) },
    { ticker: "AMD", strike: 180, expiry: daysOut(30), callPut: "C", premium: 890000, size: 200, price: 44.50, classification: "SWEEP", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 85, underlyingPrice: 165, time: hoursAgo(now, 0.25) },
    { ticker: "SPY", strike: 520, expiry: daysOut(3), callPut: "P", premium: 3200000, size: 1200, price: 26.67, classification: "BLOCK", atBidAsk: "ASK", direction: "BEARISH", smartMoneyScore: 83, underlyingPrice: 525, time: hoursAgo(now, 2) },
    { ticker: "META", strike: 520, expiry: daysOut(21), callPut: "C", premium: 1120000, size: 150, price: 74.67, classification: "REPEAT", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 79, underlyingPrice: 505, time: hoursAgo(now, 1.5) },
    { ticker: "AAPL", strike: 195, expiry: daysOut(14), callPut: "C", premium: 540000, size: 180, price: 30.00, classification: "SWEEP", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 76, underlyingPrice: 189, time: hoursAgo(now, 3) },
    { ticker: "MSFT", strike: 420, expiry: daysOut(7), callPut: "C", premium: 680000, size: 100, price: 68.00, classification: "BLOCK", atBidAsk: "MID", direction: "NEUTRAL", smartMoneyScore: 71, underlyingPrice: 417, time: hoursAgo(now, 2.5) },
    { ticker: "JPM", strike: 200, expiry: daysOut(14), callPut: "P", premium: 320000, size: 160, price: 20.00, classification: "SPLIT", atBidAsk: "ASK", direction: "BEARISH", smartMoneyScore: 68, underlyingPrice: 198, time: hoursAgo(now, 4) },
    { ticker: "AMZN", strike: 190, expiry: daysOut(21), callPut: "C", premium: 410000, size: 120, price: 34.17, classification: "REPEAT", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 65, underlyingPrice: 186, time: hoursAgo(now, 3.5) },
    { ticker: "QQQ", strike: 445, expiry: daysOut(7), callPut: "P", premium: 580000, size: 250, price: 23.20, classification: "SWEEP", atBidAsk: "BID", direction: "BULLISH", smartMoneyScore: 62, underlyingPrice: 452, time: hoursAgo(now, 5) },
    { ticker: "NVDA", strike: 850, expiry: daysOut(7), callPut: "C", premium: 290000, size: 50, price: 58.00, classification: "BLOCK", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 58, underlyingPrice: 878, time: hoursAgo(now, 4.5) },
    { ticker: "TSLA", strike: 240, expiry: daysOut(14), callPut: "C", premium: 180000, size: 80, price: 22.50, classification: "SPLIT", atBidAsk: "ASK", direction: "BULLISH", smartMoneyScore: 54, underlyingPrice: 248, time: hoursAgo(now, 6) },
  ];

  let filtered = trades
    .filter((t) => t.smartMoneyScore >= minScore)
    .filter((t) => direction === "all" || t.direction === direction)
    .filter((t) => !filterTicker || t.ticker === filterTicker)
    .slice(0, limit);

  // Demo anomalies
  const anomalies: SmartFlowAnomaly[] = [
    {
      ticker: "NVDA",
      type: "smart_money_cluster",
      severity: "high",
      description: "NVDA: 3 high-conviction trades (avg score 82/100), $3.5M total premium, direction: BULLISH",
      narrative: "$3.5M in NVDA call sweeps hit the tape in the last 2 hours, all at ask, spanning CBOE, ISE, and PHLX. In the last 8 instances where NVDA saw call sweep clusters of this magnitude within 48h of earnings, the stock moved +5.8% on average within 5 trading days. Current implied move is only 4.2% — the flow is pricing in a beat.",
    },
    {
      ticker: "TSLA",
      type: "volume_spike",
      severity: "high",
      description: "TSLA options volume 4.2x above 20-day avg. Heavy put buying at $260 strike.",
      narrative: "TSLA put volume running 4.2x the 20-day average with the $260 strike absorbing $1.85M in block prints. Historical context: when TSLA put/call ratio exceeds 1.8 with premium concentrated in near-term strikes, the stock has underperformed by -3.1% over the following week 67% of the time (12/18 signals).",
    },
    {
      ticker: "SPY",
      type: "pcr_flip",
      severity: "medium",
      description: "SPY put/call ratio at 2.34 — heavy institutional hedging via weekly puts.",
      narrative: "SPY 0DTE put buying surged to $3.2M in the last hour, pushing the intraday P/C ratio to 2.34. This level of hedging typically precedes either a volatility event or acts as a contrarian indicator — in 14 of the last 20 instances, SPY closed higher the next session.",
    },
  ];

  return {
    date: today,
    dataSource: "demo",
    totalTrades: filtered.length,
    trades: filtered,
    anomalies: anomalies.filter(
      (a) => !filterTicker || a.ticker === filterTicker
    ),
    summary: {
      bullishCount: filtered.filter((t) => t.direction === "BULLISH").length,
      bearishCount: filtered.filter((t) => t.direction === "BEARISH").length,
      neutralCount: filtered.filter((t) => t.direction === "NEUTRAL").length,
      totalPremium: filtered.reduce((s, t) => s + t.premium, 0),
      avgScore: filtered.length > 0
        ? Math.round(filtered.reduce((s, t) => s + t.smartMoneyScore, 0) / filtered.length)
        : 0,
      topSweeps: filtered.filter((t) => t.classification === "SWEEP").length,
      topBlocks: filtered.filter((t) => t.classification === "BLOCK").length,
    },
  };
}

function daysOut(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

function hoursAgo(now: Date, h: number): string {
  return new Date(now.getTime() - h * 3600000).toISOString();
}

// ─── Types ──────────────────────────────────────────────

interface SmartFlowTrade {
  ticker: string;
  strike: number;
  expiry: string;
  callPut: string;
  premium: number;
  size: number;
  price: number;
  classification: string;
  atBidAsk: string;
  direction: string;
  smartMoneyScore: number;
  underlyingPrice: number;
  time: string;
}

interface SmartFlowAnomaly {
  ticker: string;
  type: string;
  severity: string;
  description: string;
  narrative: string;
}

interface SmartFlowResponse {
  date: string;
  dataSource: string;
  totalTrades: number;
  trades: SmartFlowTrade[];
  anomalies: SmartFlowAnomaly[];
  summary: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    totalPremium: number;
    avgScore: number;
    topSweeps: number;
    topBlocks: number;
  };
}
