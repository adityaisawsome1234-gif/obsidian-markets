import { NextRequest, NextResponse } from "next/server";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/stock/:ticker/tone-history
 *
 * Returns management confidence score time series across quarters.
 * Proprietary data: tracks tone shifts with historical pattern accuracy.
 *
 * Query params:
 *   - quarters (default 12, max 20) — how many quarters of history
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

  const quarters = Math.min(parseInt(req.nextUrl.searchParams.get("quarters") || "12", 10), 20);

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    try {
      const resp = await fetch(
        `${backendUrl}/api/earnings/tone/${ticker}?quarters=${quarters}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data?.history?.length > 0) {
          return NextResponse.json(data, { headers: { "X-Data-Source": "proprietary" } });
        }
      }
    } catch { /* backend unavailable */ }

    return NextResponse.json(buildDemoToneHistory(ticker, quarters), {
      headers: { "X-Data-Source": "demo" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tone history" }, { status: 500 });
  }
}

function buildDemoToneHistory(ticker: string, quarters: number) {
  const seed = ticker.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const baseScore = 5 + (seed % 4); // 5-8 base

  const history: { quarter: string; score: number; tone: string; delta: number; date: string }[] = [];
  const year = 2026;

  for (let i = 0; i < Math.min(quarters, 8); i++) {
    const q = 4 - (i % 4);
    const y = year - Math.floor(i / 4);
    const variation = Math.sin(seed + i * 1.3) * 2;
    const score = Math.max(1, Math.min(10, Math.round(baseScore + variation)));
    const prevScore = i < 7
      ? Math.max(1, Math.min(10, Math.round(baseScore + Math.sin(seed + (i + 1) * 1.3) * 2)))
      : baseScore;
    const delta = score - prevScore;

    const tones = ["confident", "cautious", "confident", "defensive"];
    const tone = score >= 7 ? "confident" : score >= 5 ? "cautious" : score >= 3 ? "defensive" : "evasive";

    history.push({
      quarter: `Q${q} ${y}`,
      score,
      tone,
      delta,
      date: `${y}-${String(q * 3).padStart(2, "0")}-28`,
    });
  }

  // Compute trend
  const recent = history.slice(0, 4).map((h) => h.score);
  const older = history.slice(4, 8).map((h) => h.score);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
  const trend = recentAvg > olderAvg + 0.5 ? "improving" : recentAvg < olderAvg - 0.5 ? "declining" : "stable";

  return {
    ticker,
    dataSource: "demo",
    history,
    summary: {
      currentScore: history[0]?.score ?? 5,
      avgScore: Math.round(history.reduce((s, h) => s + h.score, 0) / history.length * 10) / 10,
      trend,
      highestScore: { quarter: history.reduce((a, b) => a.score > b.score ? a : b).quarter, score: Math.max(...history.map((h) => h.score)) },
      lowestScore: { quarter: history.reduce((a, b) => a.score < b.score ? a : b).quarter, score: Math.min(...history.map((h) => h.score)) },
      significantShifts: history.filter((h) => Math.abs(h.delta) >= 3).length,
    },
  };
}
