import { NextRequest, NextResponse } from "next/server";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/stock/:ticker/earnings-intelligence
 *
 * Returns AI-extracted earnings call intelligence for a given ticker.
 * Includes: tone analysis, guidance extraction, red flags, key quotes,
 * competitive mentions, analyst concern quality ratings, and bull/bear signals.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { ticker: raw } = await params;
  const ticker = validateTicker(raw);
  if (!ticker) return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    try {
      const resp = await fetch(
        `${backendUrl}/api/earnings/intelligence/${ticker}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data?.quarters?.length > 0) {
          return NextResponse.json(data, {
            headers: { "X-Data-Source": "proprietary-earnings-pipeline" },
          });
        }
      }
    } catch { /* backend unavailable */ }

    return NextResponse.json(buildDemoEarnings(ticker), {
      headers: { "X-Data-Source": "demo" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch earnings intelligence" }, { status: 500 });
  }
}

function buildDemoEarnings(ticker: string): EarningsIntelligenceResponse {
  const company = COMPANIES[ticker] || `${ticker} Inc.`;
  return {
    ticker,
    company,
    dataSource: "demo",
    quarters: [
      {
        quarter: "Q4 2025",
        date: "2026-01-28",
        overallTone: "confident",
        toneVsLastQuarter: "more_confident",
        confidenceScore: 8,
        toneDelta: 2,
        guidance: {
          revenue: { low: 40.0, high: 42.0, vsConsensus: "above" },
          eps: { low: 0.92, high: 0.97, vsConsensus: "above" },
          other: ["Expect gross margins in 75-77% range", "Blackwell ramp on track for Q2"],
        },
        keyMetrics: [
          { metric: "Revenue", value: "$39.3B", context: "Up 78% YoY", vsPrior: "improved" },
          { metric: "Gross Margin", value: "76.8%", context: "Up from 73.2% QoQ", vsPrior: "improved" },
          { metric: "Datacenter Revenue", value: "$21.2B", context: "Up 112% YoY", vsPrior: "improved" },
          { metric: "Free Cash Flow", value: "$18.9B", context: "Record quarter", vsPrior: "improved" },
        ],
        analystConcerns: [
          { topic: "Custom silicon competition from hyperscalers", firm: "Morgan Stanley", responseQuality: "strong" },
          { topic: "Supply constraints timeline", firm: "Goldman Sachs", responseQuality: "adequate" },
          { topic: "Gross margin sustainability with Blackwell ramp", firm: "JP Morgan", responseQuality: "strong" },
        ],
        redFlags: [],
        competitiveMentions: [
          { competitor: "Custom silicon (general)", context: "CEO dismisses as complementary, not competitive", sentiment: "positive" },
        ],
        keyQuotes: [
          { speaker: "CEO", quote: "We are still in the early innings of the AI infrastructure buildout.", significance: "Signals continued growth runway" },
          { speaker: "CFO", quote: "We expect gross margins to remain in the 75-77% range for the foreseeable future.", significance: "Margin durability signal" },
        ],
        bullSignal: "Revenue guidance of $40-42B significantly above consensus of $38.5B, signaling accelerating demand",
        bearSignal: "Blackwell ramp may cause 100-200bps gross margin dip in initial quarters",
      },
      {
        quarter: "Q3 2025",
        date: "2025-10-22",
        overallTone: "confident",
        toneVsLastQuarter: "unchanged",
        confidenceScore: 6,
        toneDelta: 0,
        guidance: {
          revenue: { low: 37.0, high: 39.0, vsConsensus: "above" },
          eps: { low: 0.80, high: 0.85, vsConsensus: "inline" },
          other: ["Supply improving but still constrained"],
        },
        keyMetrics: [
          { metric: "Revenue", value: "$35.1B", context: "Up 94% YoY", vsPrior: "improved" },
          { metric: "Gross Margin", value: "73.2%", context: "Stable QoQ", vsPrior: "unchanged" },
        ],
        analystConcerns: [
          { topic: "Demand sustainability beyond 2025", firm: "Bernstein", responseQuality: "adequate" },
        ],
        redFlags: ["Management used 'potentially' 3x more than prior quarter when discussing long-term demand"],
        competitiveMentions: [],
        keyQuotes: [
          { speaker: "CEO", quote: "Demand continues to outpace our supply capacity.", significance: "Supply-constrained revenue" },
        ],
        bullSignal: "94% YoY growth with improving supply indicates further acceleration ahead",
        bearSignal: "Increasing hedging language around long-term demand sustainability",
      },
    ],
    toneHistory: [
      { quarter: "Q4 2025", score: 8, tone: "confident" },
      { quarter: "Q3 2025", score: 6, tone: "confident" },
      { quarter: "Q2 2025", score: 6, tone: "cautious" },
      { quarter: "Q1 2025", score: 7, tone: "confident" },
    ],
    toneShifts: [
      {
        currentQuarter: "Q4 2025",
        priorQuarter: "Q3 2025",
        delta: 2,
        description: "CEO confidence jumped 2 points (6→8). Guidance raise + margin expansion drove the shift.",
        historicalAccuracy: "In our dataset, a 2+ point confidence jump preceded a beat-and-raise quarter 61% of the time.",
      },
    ],
  };
}

const COMPANIES: Record<string, string> = {
  AAPL: "Apple Inc.", NVDA: "NVIDIA Corp", MSFT: "Microsoft Corp",
  GOOGL: "Alphabet Inc.", AMZN: "Amazon.com", META: "Meta Platforms",
  TSLA: "Tesla Inc.", JPM: "JPMorgan Chase", V: "Visa Inc.", UNH: "UnitedHealth Group",
};

interface EarningsIntelligenceResponse {
  ticker: string;
  company: string;
  dataSource: string;
  quarters: {
    quarter: string;
    date: string;
    overallTone: string;
    toneVsLastQuarter: string;
    confidenceScore: number;
    toneDelta: number;
    guidance: {
      revenue: { low: number | null; high: number | null; vsConsensus: string };
      eps: { low: number | null; high: number | null; vsConsensus: string };
      other: string[];
    };
    keyMetrics: { metric: string; value: string; context: string; vsPrior: string }[];
    analystConcerns: { topic: string; firm: string; responseQuality: string }[];
    redFlags: string[];
    competitiveMentions: { competitor: string; context: string; sentiment: string }[];
    keyQuotes: { speaker: string; quote: string; significance: string }[];
    bullSignal: string;
    bearSignal: string;
  }[];
  toneHistory: { quarter: string; score: number; tone: string }[];
  toneShifts: { currentQuarter: string; priorQuarter: string; delta: number; description: string; historicalAccuracy: string }[];
}
