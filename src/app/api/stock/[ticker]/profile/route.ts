import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

ensureEnv();

const STABLE_BASE = "https://financialmodelingprep.com/stable";
const V3_BASE = "https://financialmodelingprep.com/api/v3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const symbol = validateTicker(ticker);
  if (!symbol) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  // Rate limit
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey || fmpKey.length < 5) {
    return NextResponse.json(
      { ticker: symbol, error: "Fundamental data service not configured" },
      { status: 503 }
    );
  }

  const results: Record<string, unknown> = { ticker: symbol };

  /** Fetch from a full URL, return parsed JSON or null */
  async function rawFetch(url: string): Promise<unknown> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** Check if a response is "empty" (null, empty array, or empty object) */
  function isEmpty(data: unknown): boolean {
    if (data == null) return true;
    if (Array.isArray(data) && data.length === 0) return true;
    if (typeof data === "object" && Object.keys(data as object).length === 0) return true;
    return false;
  }

  /** Try stable endpoint first, then v3 fallback. */
  async function fmpFetchWithFallback(
    stablePath: string,
    v3Path: string
  ): Promise<unknown> {
    const stableUrl = `${STABLE_BASE}/${stablePath}${stablePath.includes("?") ? "&" : "?"}apikey=${fmpKey}`;
    const data = await rawFetch(stableUrl);
    if (!isEmpty(data)) return data;

    const v3Url = `${V3_BASE}/${v3Path}${v3Path.includes("?") ? "&" : "?"}apikey=${fmpKey}`;
    const fallback = await rawFetch(v3Url);
    if (!isEmpty(fallback)) return fallback;

    return null;
  }

  // Fetch all in parallel — each tries stable then v3
  const [profile, income, ratios, earnings, estimates, holders] = await Promise.all([
    fmpFetchWithFallback(`profile?symbol=${symbol}`, `profile/${symbol}`),
    fmpFetchWithFallback(`income-statement?symbol=${symbol}&period=annual&limit=4`, `income-statement/${symbol}?period=annual&limit=4`),
    fmpFetchWithFallback(`ratios-ttm?symbol=${symbol}`, `ratios-ttm/${symbol}`),
    fmpFetchWithFallback(`earning-calendar-confirmed?symbol=${symbol}`, `historical/earning_calendar/${symbol}?limit=8`),
    fmpFetchWithFallback(`analyst-estimates?symbol=${symbol}&limit=1`, `analyst-estimates/${symbol}?limit=1`),
    fmpFetchWithFallback(`institutional-holder?symbol=${symbol}`, `institutional-holder/${symbol}`),
  ]);

  results.profile = profile;
  results.income = income;
  results.ratios = ratios;
  results.earnings = earnings;
  results.estimates = estimates;
  results.holders = holders;

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      "X-RateLimit-Remaining": String(rl.remaining),
    },
  });
}
