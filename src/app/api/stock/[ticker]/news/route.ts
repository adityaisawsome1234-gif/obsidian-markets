import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

ensureEnv();

interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  category: string;
  related: string;
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

  const articles: NewsArticle[] = [];

  // Try Finnhub company-specific news first
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey && finnhubKey.length > 5) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
      const res = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${weekAgo}&to=${today}&token=${finnhubKey}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.slice(0, 12).forEach((n: Record<string, unknown>, i: number) => {
            articles.push({
              id: i,
              headline: (n.headline as string) || "",
              summary: (n.summary as string) || "",
              source: (n.source as string) || "Finnhub",
              url: (n.url as string) || "",
              image: (n.image as string) || "",
              datetime: (n.datetime as number) || 0,
              category: (n.category as string) || "company news",
              related: symbol,
            });
          });
        }
      }
    } catch { /* fall through to Polygon */ }
  }

  // Also try Polygon for additional coverage
  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey && polygonKey.length > 5 && articles.length < 8) {
    try {
      const res = await fetch(
        `https://api.polygon.io/v2/reference/news?ticker=${encodeURIComponent(symbol)}&limit=8&apiKey=${polygonKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        const results = data?.results;
        if (Array.isArray(results)) {
          results.forEach((n: Record<string, unknown>, i: number) => {
            const headline = n.title as string;
            if (articles.some((a) => a.headline === headline)) return;

            articles.push({
              id: 100 + i,
              headline,
              summary: (n.description as string) || "",
              source: ((n.publisher as Record<string, unknown>)?.name as string) || "Polygon",
              url: (n.article_url as string) || "",
              image: (n.image_url as string) || "",
              datetime: Math.floor(new Date((n.published_utc as string) || "").getTime() / 1000),
              category: "company news",
              related: symbol,
            });
          });
        }
      }
    } catch { /* fall through */ }
  }

  articles.sort((a, b) => b.datetime - a.datetime);

  return NextResponse.json(
    { ticker: symbol, articles: articles.slice(0, 15) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    }
  );
}
