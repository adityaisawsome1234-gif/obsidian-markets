import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

ensureEnv();

// In-memory cache with size limit to prevent memory exhaustion
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheSet(key: string, data: unknown) {
  // Evict oldest entries if cache is too large
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

// Map our UI timeframes to Polygon API parameters
function getPolygonParams(range: string, interval: string) {
  // Range → from/to dates, interval → multiplier/timespan
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  let from: string;
  let multiplier = 1;
  let timespan = "day";

  switch (range) {
    case "1d":
      from = to;
      multiplier = 5;
      timespan = "minute";
      break;
    case "5d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
      multiplier = 15;
      timespan = "minute";
      break;
    }
    case "1mo": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      from = d.toISOString().split("T")[0];
      timespan = "day";
      break;
    }
    case "3mo": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      from = d.toISOString().split("T")[0];
      timespan = "day";
      break;
    }
    case "6mo": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      from = d.toISOString().split("T")[0];
      timespan = "day";
      break;
    }
    case "ytd": {
      from = `${now.getFullYear()}-01-01`;
      timespan = "day";
      break;
    }
    case "1y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      from = d.toISOString().split("T")[0];
      timespan = "day";
      break;
    }
    case "5y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      from = d.toISOString().split("T")[0];
      multiplier = 1;
      timespan = "week";
      break;
    }
    case "max": {
      from = "2000-01-01";
      multiplier = 1;
      timespan = "month";
      break;
    }
    default: {
      // Fallback: use interval hint
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      from = d.toISOString().split("T")[0];
      if (interval === "1wk") { timespan = "week"; }
      else if (interval === "1mo") { timespan = "month"; }
      else { timespan = "day"; }
    }
  }

  return { from, to, multiplier, timespan };
}

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

  const { searchParams } = req.nextUrl;
  const VALID_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "5y", "max"]);
  const VALID_INTERVALS = new Set(["1m", "5m", "15m", "1d", "1wk", "1mo"]);
  const range = VALID_RANGES.has(searchParams.get("range") || "") ? searchParams.get("range")! : "1y";
  const interval = VALID_INTERVALS.has(searchParams.get("interval") || "") ? searchParams.get("interval")! : "1d";

  // Check cache
  const cacheKey = `${symbol}:${range}:${interval}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  const polyKey = process.env.POLYGON_API_KEY;

  // Try Polygon first (most reliable)
  if (polyKey) {
    try {
      const { from, to, multiplier, timespan } = getPolygonParams(range, interval);
      const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${polyKey}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const json = await res.json();
        const results = json.results || [];

        if (results.length > 0) {
          // Convert Polygon format to Yahoo-compatible format for the frontend
          const yahooCompatible = {
            chart: {
              result: [{
                meta: { symbol },
                indicators: {
                  quote: [{
                    open: results.map((r: { o: number }) => r.o),
                    high: results.map((r: { h: number }) => r.h),
                    low: results.map((r: { l: number }) => r.l),
                    close: results.map((r: { c: number }) => r.c),
                    volume: results.map((r: { v: number }) => r.v),
                  }],
                },
                timestamp: results.map((r: { t: number }) => r.t / 1000),
              }],
            },
          };

          cacheSet(cacheKey, yahooCompatible);

          return NextResponse.json(yahooCompatible, {
            headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
          });
        }
      }
    } catch {
      // Fall through to Yahoo fallback
    }
  }

  // Fallback: Yahoo Finance (may be rate-limited)
  const YF_ENDPOINTS = [
    "https://query2.finance.yahoo.com/v8/finance/chart",
    "https://query1.finance.yahoo.com/v8/finance/chart",
  ];

  for (const baseUrl of YF_ENDPOINTS) {
    try {
      const url = `${baseUrl}/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.status === 429 || !res.ok) continue;

      const data = await res.json();
      if (!data?.chart?.result?.[0]) continue;

      cacheSet(cacheKey, data);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: `Chart data unavailable for "${symbol}".` },
    { status: 502 }
  );
}
