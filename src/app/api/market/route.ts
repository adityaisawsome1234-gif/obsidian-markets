import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

ensureEnv();

// ─── Yahoo Finance Chart API (no auth needed) ───────────────
const YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";

interface ChartMeta {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  marketCap?: number;
  chartPreviousClose?: number;
}

async function fetchQuoteViaChart(symbol: string): Promise<ChartMeta | null> {
  try {
    const res = await fetch(
      `${YF_CHART}/${symbol}?range=5d&interval=1d&includePrePost=false`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const closes = rawCloses.filter((v): v is number => v != null && !isNaN(v));

    const currentPrice = meta.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);

    // Determine previous close for daily change calculation:
    // Yahoo duplicates the last close when market is closed, so we need
    // to find the last close that DIFFERS from the current price.
    const prevClose: number = (() => {
      if (closes.length >= 2) {
        for (let i = closes.length - 1; i >= 0; i--) {
          if (Math.abs(closes[i] - currentPrice) > 0.02) return closes[i];
        }
      }
      return meta.chartPreviousClose || meta.previousClose || currentPrice;
    })() as number;

    return {
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || meta.longName || symbol,
      regularMarketPrice: currentPrice,
      previousClose: prevClose,
      regularMarketVolume: meta.regularMarketVolume || 0,
      regularMarketDayHigh: meta.regularMarketDayHigh || 0,
      regularMarketDayLow: meta.regularMarketDayLow || 0,
      fiftyDayAverage: meta.fiftyDayAverage || 0,
      twoHundredDayAverage: meta.twoHundredDayAverage || 0,
      chartPreviousClose: meta.chartPreviousClose || 0,
      _closes: closes,
    } as ChartMeta & { _closes: number[] };
  } catch {
    return null;
  }
}

async function fetchBatchQuotes(symbols: string[]) {
  const results = await Promise.allSettled(
    symbols.map((s) => fetchQuoteViaChart(s))
  );
  return results.map((r) => (r.status === "fulfilled" ? r.value : null));
}

// ─── News: Finnhub → Polygon → Fallback ─────────────────────
async function fetchMarketNews() {
  // Try Finnhub first
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey && !finnhubKey.startsWith("your-")) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, 15).map((n: Record<string, unknown>) => ({
            id: n.id, headline: n.headline, summary: n.summary,
            source: n.source, url: n.url, image: n.image,
            datetime: n.datetime, category: n.category,
          }));
        }
      }
    } catch { /* fall through */ }
  }

  // Try Polygon news
  const polygonKey = process.env.POLYGON_API_KEY;
  if (polygonKey && !polygonKey.startsWith("your-")) {
    try {
      const res = await fetch(
        `https://api.polygon.io/v2/reference/news?limit=15&apiKey=${polygonKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        const results = data?.results;
        if (Array.isArray(results) && results.length > 0) {
          return results.map((n: Record<string, unknown>, i: number) => ({
            id: i,
            headline: n.title,
            summary: n.description || "",
            source: (n.publisher as Record<string, unknown>)?.name || "Polygon",
            url: n.article_url,
            image: n.image_url || "",
            datetime: Math.floor(new Date(n.published_utc as string).getTime() / 1000),
            category: "general",
          }));
        }
      }
    } catch { /* fall through */ }
  }

  return getFallbackNews();
}

function getFallbackNews() {
  const now = Math.floor(Date.now() / 1000);
  return [
    { id: 1, headline: "Markets closed — data refreshes at next market open", source: "Obsidian", datetime: now, category: "general", url: "" },
    { id: 2, headline: "Add FINNHUB_API_KEY to .env.local for real-time news", source: "Setup", datetime: now - 60, category: "general", url: "" },
  ];
}

// ─── FMP Economic & Earnings Calendar ──────────────────────
async function fetchFmpCalendar() {
  const key = process.env.FMP_API_KEY;
  if (!key || key.startsWith("your-")) return { economic: [], earnings: [] };
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
  try {
    const [econRes, earnRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${today}&to=${weekEnd}&apikey=${key}`, { signal: AbortSignal.timeout(6000) }),
      fetch(`https://financialmodelingprep.com/api/v3/earning_calendar?from=${today}&to=${weekEnd}&apikey=${key}`, { signal: AbortSignal.timeout(6000) }),
    ]);
    const economic = econRes.ok ? (await econRes.json()).slice(0, 20) : [];
    const earnings = earnRes.ok ? (await earnRes.json()).slice(0, 20) : [];
    return { economic, earnings };
  } catch {
    return { economic: [], earnings: [] };
  }
}

// ─── FRED Macro Data ──────────────────────────────────────
async function fetchFredMacro() {
  const key = process.env.FRED_API_KEY;
  if (!key || key.startsWith("your-")) return { fedFundsRate: null, cpi: null, unemployment: null };
  const base = "https://api.stlouisfed.org/fred/series/observations";
  const series: Record<string, string> = {
    fedFundsRate: "FEDFUNDS",
    cpi: "CPIAUCSL",
    unemployment: "UNRATE",
  };
  const result: Record<string, { value: number; date: string } | null> = {};
  for (const [key2, seriesId] of Object.entries(series)) {
    try {
      const res = await fetch(`${base}?series_id=${seriesId}&sort_order=desc&limit=1&file_type=json&api_key=${key}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const obs = data?.observations?.[0];
        if (obs) result[key2] = { value: parseFloat(obs.value), date: obs.date };
        else result[key2] = null;
      } else {
        result[key2] = null;
      }
    } catch {
      result[key2] = null;
    }
  }
  return result;
}

// ─── Master endpoint ────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.market);
  if (!rl.allowed) return rateLimitResponse(rl);

  const ts = new Date().toISOString();

  // Define symbols
  const indexSymbols = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];
  const watchlistSymbols = ["AAPL", "NVDA", "TSLA", "META", "AMZN", "MSFT", "GOOGL", "AMD"];
  const sectorSymbols = ["XLK", "XLF", "XLE", "XLV", "XLC", "XLI", "XLP", "XLU", "XLRE", "XLB", "XLY"];
  const commoditySymbols = ["GC=F", "CL=F", "BTC-USD", "ETH-USD"];
  const bondSymbols = ["^TNX", "^TYX"];

  // Fetch everything in parallel
  const [indexResults, watchlistResults, sectorResults, commodityResults, bondResults, news, fmpCal, fredMacro] =
    await Promise.all([
      fetchBatchQuotes(indexSymbols),
      fetchBatchQuotes(watchlistSymbols),
      fetchBatchQuotes(sectorSymbols),
      fetchBatchQuotes(commoditySymbols),
      fetchBatchQuotes(bondSymbols),
      fetchMarketNews(),
      fetchFmpCalendar(),
      fetchFredMacro(),
    ]);

  // Helper to compute change
  function toQuote(meta: (ChartMeta & { _closes?: number[] }) | null) {
    if (!meta) return null;
    const price = meta.regularMarketPrice || 0;
    const prev = meta.previousClose || meta.chartPreviousClose || price;
    const change = price - prev;
    const pct = prev > 0 ? (change / prev) * 100 : 0;
    return { price, change, changePercent: pct, meta };
  }

  const nameMap: Record<string, string> = {
    "^GSPC": "S&P 500", "^IXIC": "Nasdaq", "^DJI": "Dow Jones",
    "^RUT": "Russell 2000", "^VIX": "VIX", "^TNX": "10Y Yield", "^TYX": "30Y Yield",
    "GC=F": "Gold", "CL=F": "Oil", "BTC-USD": "Bitcoin", "ETH-USD": "Ethereum",
  };

  const symMap: Record<string, string> = {
    "^GSPC": "SPX", "^IXIC": "NDX", "^DJI": "DJI", "^RUT": "RUT", "^VIX": "VIX",
    "^TNX": "TNX", "^TYX": "TYX", "GC=F": "GC", "CL=F": "CL", "BTC-USD": "BTC", "ETH-USD": "ETH",
  };

  // Build indices
  const indices = indexResults
    .map((r) => {
      const q = toQuote(r);
      if (!q || !r) return null;
      return {
        symbol: symMap[r.symbol] || r.symbol,
        name: nameMap[r.symbol] || r.shortName || r.symbol,
        value: q.price,
        change: q.change,
        changePercent: q.changePercent,
      };
    })
    .filter(Boolean);

  // Add bonds
  bondResults.forEach((r) => {
    const q = toQuote(r);
    if (q && r) {
      indices.push({
        symbol: symMap[r.symbol] || r.symbol,
        name: nameMap[r.symbol] || r.shortName || r.symbol,
        value: q.price,
        change: q.change,
        changePercent: q.changePercent,
      });
    }
  });

  // Commodities
  const commodities = commodityResults
    .map((r) => {
      const q = toQuote(r);
      if (!q || !r) return null;
      return {
        symbol: symMap[r.symbol] || r.symbol,
        name: nameMap[r.symbol] || r.shortName || r.symbol,
        value: q.price,
        change: q.change,
        changePercent: q.changePercent,
      };
    })
    .filter(Boolean);

  // Watchlist
  const watchlist = watchlistResults
    .map((r) => {
      if (!r) return null;
      const q = toQuote(r);
      if (!q) return null;
      const closes = (r as ChartMeta & { _closes?: number[] })._closes || [];
      return {
        ticker: r.symbol,
        name: r.shortName || r.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        volume: r.regularMarketVolume || 0,
        marketCap: r.marketCap || 0,
        sparkline: closes.slice(-20),
      };
    })
    .filter(Boolean);

  // Sectors
  const sectorNameMap: Record<string, string> = {
    XLK: "Technology", XLF: "Financials", XLE: "Energy", XLV: "Healthcare",
    XLC: "Communication", XLI: "Industrials", XLP: "Consumer Staples",
    XLU: "Utilities", XLRE: "Real Estate", XLB: "Materials", XLY: "Consumer Disc.",
  };

  const sectors = sectorResults
    .map((r) => {
      const q = toQuote(r);
      if (!q || !r) return null;
      return {
        symbol: r.symbol,
        name: sectorNameMap[r.symbol] || r.shortName || r.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
      };
    })
    .filter(Boolean);

  // Gainers & losers
  const allStocks = [...(watchlist || [])].filter((s) => s && s.changePercent != null);
  const sorted = [...allStocks].sort((a, b) => (b?.changePercent || 0) - (a?.changePercent || 0));
  const gainers = sorted.slice(0, 5).map((q) => ({
    symbol: q?.ticker || "", name: q?.name || "", price: q?.price || 0, changePercent: q?.changePercent || 0,
  }));
  const losers = sorted.slice(-5).reverse().map((q) => ({
    symbol: q?.ticker || "", name: q?.name || "", price: q?.price || 0, changePercent: q?.changePercent || 0,
  }));

  // Macro
  const tnxQuote = bondResults[0];
  const tyxQuote = bondResults[1];
  const macro = {
    fedFundsRate: fredMacro.fedFundsRate || null,
    cpi: fredMacro.cpi || null,
    unemployment: fredMacro.unemployment || null,
    treasuryYields: {
      "10Y": tnxQuote?.regularMarketPrice || null,
      "5Y": null,
      "30Y": tyxQuote?.regularMarketPrice || null,
    },
  };

  return NextResponse.json({
    _fetched_at: ts,
    _source: "yahoo_finance_chart+finnhub+fmp+fred",
    indices,
    commodities,
    watchlist,
    sectors,
    gainers,
    losers,
    news,
    macro,
    economicCalendar: fmpCal.economic,
    earningsCalendar: fmpCal.earnings,
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
