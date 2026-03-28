import { NextRequest, NextResponse } from "next/server";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/options/flow/history/:ticker
 *
 * Returns historical flow accuracy stats for a given ticker:
 *   - What % of bullish flow preceded positive moves within 5 trading days
 *   - Accuracy breakdown by classification type (SWEEP, BLOCK, etc.)
 *   - Average magnitude of correct vs incorrect signals
 *   - Recent signal history with outcomes
 *
 * Data source: options_flow_classified + options_flow_accuracy tables
 * populated by the Python options intelligence pipeline.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { ticker: rawTicker } = await params;
  const ticker = validateTicker(rawTicker);
  if (!ticker) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") || "90", 10);

  try {
    const dbData = await fetchFromBackend(ticker, days);
    if (dbData) {
      return NextResponse.json(dbData, {
        headers: {
          "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600",
          "X-Data-Source": "proprietary-flow-pipeline",
        },
      });
    }

    return NextResponse.json(buildDemoHistory(ticker, days), {
      headers: {
        "Cache-Control": "private, s-maxage=60",
        "X-Data-Source": "demo",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch flow history" },
      { status: 500 }
    );
  }
}

async function fetchFromBackend(
  ticker: string, days: number
): Promise<FlowHistoryResponse | null> {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  try {
    const resp = await fetch(
      `${backendUrl}/api/options/flow/history/${ticker}?days=${days}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function buildDemoHistory(ticker: string, days: number): FlowHistoryResponse {
  // Deterministic but ticker-varied demo stats
  const seed = ticker.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const accuracy = 58 + (seed % 20); // 58-77% range
  const totalSignals = 30 + (seed % 40);
  const correct = Math.round(totalSignals * accuracy / 100);

  const byClassification: ClassificationAccuracy[] = [
    {
      classification: "SWEEP",
      total: Math.round(totalSignals * 0.35),
      correct: Math.round(totalSignals * 0.35 * (accuracy + 5) / 100),
      accuracyPct: Math.min(accuracy + 5, 85),
      avgMoveCorrect: 3.2 + (seed % 20) / 10,
      avgMoveIncorrect: -(1.8 + (seed % 10) / 10),
    },
    {
      classification: "BLOCK",
      total: Math.round(totalSignals * 0.30),
      correct: Math.round(totalSignals * 0.30 * accuracy / 100),
      accuracyPct: accuracy,
      avgMoveCorrect: 2.8 + (seed % 15) / 10,
      avgMoveIncorrect: -(2.1 + (seed % 8) / 10),
    },
    {
      classification: "REPEAT",
      total: Math.round(totalSignals * 0.20),
      correct: Math.round(totalSignals * 0.20 * (accuracy - 3) / 100),
      accuracyPct: Math.max(accuracy - 3, 50),
      avgMoveCorrect: 2.4 + (seed % 12) / 10,
      avgMoveIncorrect: -(1.5 + (seed % 6) / 10),
    },
    {
      classification: "SPLIT",
      total: Math.round(totalSignals * 0.15),
      correct: Math.round(totalSignals * 0.15 * (accuracy - 8) / 100),
      accuracyPct: Math.max(accuracy - 8, 45),
      avgMoveCorrect: 1.9 + (seed % 10) / 10,
      avgMoveIncorrect: -(2.5 + (seed % 10) / 10),
    },
  ];

  const recentSignals: RecentSignal[] = [];
  for (let i = 0; i < 10; i++) {
    const daysBack = 2 + i * 3;
    const wasCorrect = (seed + i) % 3 !== 0; // ~67% correct
    const dir = (seed + i) % 2 === 0 ? "BULLISH" : "BEARISH";
    const movePct = wasCorrect
      ? (dir === "BULLISH" ? 1 : -1) * (1.5 + ((seed + i) % 30) / 10)
      : (dir === "BULLISH" ? -1 : 1) * (0.8 + ((seed + i) % 15) / 10);

    recentSignals.push({
      date: new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10),
      direction: dir,
      classification: ["SWEEP", "BLOCK", "REPEAT", "SPLIT"][i % 4],
      premium: 100000 + ((seed + i) % 20) * 50000,
      smartMoneyScore: 55 + ((seed + i) % 40),
      priceAtSignal: DEMO_PRICES[ticker] || 100,
      priceAfter5d: (DEMO_PRICES[ticker] || 100) * (1 + movePct / 100),
      movePct: Math.round(movePct * 100) / 100,
      wasCorrect,
    });
  }

  return {
    ticker,
    lookbackDays: days,
    dataSource: "demo",
    overall: {
      totalSignals,
      correctSignals: correct,
      accuracyPct: accuracy,
      avgMoveCorrect: Math.round((2.8 + (seed % 20) / 10) * 100) / 100,
      avgMoveIncorrect: Math.round(-(1.9 + (seed % 10) / 10) * 100) / 100,
      avgPremium: Math.round(250000 + (seed % 300) * 1000),
      bullishAccuracy: Math.round((accuracy + 2 + (seed % 5)) * 10) / 10,
      bearishAccuracy: Math.round((accuracy - 3 + (seed % 5)) * 10) / 10,
      bestClassification: "SWEEP",
      profitFactor: Math.round((1.2 + (seed % 15) / 10) * 100) / 100,
    },
    byClassification,
    recentSignals,
  };
}

const DEMO_PRICES: Record<string, number> = {
  AAPL: 189, NVDA: 878, MSFT: 417, GOOGL: 165, AMZN: 186,
  META: 505, TSLA: 248, AMD: 165, JPM: 198, V: 283,
  SPY: 525, QQQ: 452,
};

// ─── Types ──────────────────────────────────────────────

interface ClassificationAccuracy {
  classification: string;
  total: number;
  correct: number;
  accuracyPct: number;
  avgMoveCorrect: number;
  avgMoveIncorrect: number;
}

interface RecentSignal {
  date: string;
  direction: string;
  classification: string;
  premium: number;
  smartMoneyScore: number;
  priceAtSignal: number;
  priceAfter5d: number;
  movePct: number;
  wasCorrect: boolean;
}

interface FlowHistoryResponse {
  ticker: string;
  lookbackDays: number;
  dataSource: string;
  overall: {
    totalSignals: number;
    correctSignals: number;
    accuracyPct: number;
    avgMoveCorrect: number;
    avgMoveIncorrect: number;
    avgPremium: number;
    bullishAccuracy: number;
    bearishAccuracy: number;
    bestClassification: string;
    profitFactor: number;
  };
  byClassification: ClassificationAccuracy[];
  recentSignals: RecentSignal[];
}
