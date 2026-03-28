import { NextRequest, NextResponse } from "next/server";
import { validateSearchQuery } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.search);
  if (!rl.allowed) return rateLimitResponse(rl);

  const raw = req.nextUrl.searchParams.get("q") || "";
  const q = validateSearchQuery(raw);
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const quotes = data?.quotes || [];

    const results = quotes
      .filter((item: Record<string, unknown>) => {
        const type = item.quoteType as string;
        return ["EQUITY", "ETF", "INDEX", "CRYPTOCURRENCY", "FUTURE", "MUTUALFUND"].includes(type);
      })
      .map((item: Record<string, unknown>) => ({
        symbol: item.symbol as string,
        name: (item.shortname || item.longname || item.symbol) as string,
        exchange: (item.exchDisp || item.exchange || "") as string,
        type: (item.quoteType || "EQUITY") as string,
      }));

    return NextResponse.json({ results }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
