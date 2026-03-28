import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { validateTicker } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

ensureEnv();

const YF_ENDPOINTS = [
  "https://query2.finance.yahoo.com/v8/finance/chart",
  "https://query1.finance.yahoo.com/v8/finance/chart",
];

interface StockResult {
  meta: Record<string, unknown>;
  closes: number[];
  volumes: number[];
}

async function fetchFromYahoo(symbol: string): Promise<StockResult | null> {
  for (const baseUrl of YF_ENDPOINTS) {
    try {
      const url = `${baseUrl}/${encodeURIComponent(symbol)}?range=1mo&interval=1d&includePrePost=false`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 429 || !res.ok) continue;

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;

      const meta = result.meta || {};
      const rawCloses: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
      const rawVolumes: (number | null)[] = result.indicators?.quote?.[0]?.volume || [];

      return {
        meta,
        closes: rawCloses.filter((v): v is number => v != null && !isNaN(v)),
        volumes: rawVolumes.filter((v): v is number => v != null),
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchFromFMP(symbol: string): Promise<StockResult | null> {
  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) return null;

  try {
    // Use v3/profile — proven to work for all US stocks
    const profileRes = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${fmpKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!profileRes.ok) return null;
    const profileData = await profileRes.json();
    if (!Array.isArray(profileData) || profileData.length === 0) return null;
    const q: Record<string, unknown> = profileData[0];
    if (!q.price) return null;

    // Fetch historical for sparkline (non-blocking)
    let closes: number[] = [];
    let volumes: number[] = [];
    try {
      const histRes = await fetch(
        `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}?timeseries=30&apikey=${fmpKey}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (histRes.ok) {
        const histData = await histRes.json();
        const hist = (histData?.historical || []).reverse();
        closes = hist.map((d: { close: number }) => d.close);
        volumes = hist.map((d: { volume: number }) => d.volume);
      }
    } catch { /* sparkline is optional */ }

    const price = q.price as number;
    if (closes.length === 0 || Math.abs(closes[closes.length - 1] - price) > 0.5) {
      closes.push(price);
      volumes.push((q.volume as number) || 0);
    }

    return {
      meta: {
        symbol: (q.symbol as string) || symbol,
        shortName: (q.companyName as string) || (q.name as string) || symbol,
        exchangeName: (q.exchange as string) || (q.exchangeShortName as string) || "Unknown",
        currency: (q.currency as string) || "USD",
        regularMarketPrice: price,
        chartPreviousClose: (q.previousClose as number) || 0,
        regularMarketDayHigh: (q.dayHigh as number) || 0,
        regularMarketDayLow: (q.dayLow as number) || 0,
        regularMarketVolume: (q.volume as number) || (q.volAvg as number) || 0,
        marketCap: (q.marketCap as number) || (q.mktCap as number) || 0,
        fiftyDayAverage: (q.priceAvg50 as number) || 0,
        twoHundredDayAverage: (q.priceAvg200 as number) || 0,
        fiftyTwoWeekHigh: (q.yearHigh as number) || (q.range as string)?.split("-").pop()?.trim() ? parseFloat((q.range as string).split("-").pop()!.trim()) : 0,
        fiftyTwoWeekLow: (q.yearLow as number) || (q.range as string)?.split("-")[0]?.trim() ? parseFloat((q.range as string).split("-")[0].trim()) : 0,
        instrumentType: "EQUITY",
      },
      closes,
      volumes,
    };
  } catch {
    return null;
  }
}

async function fetchFromPolygon(symbol: string): Promise<StockResult | null> {
  const polyKey = process.env.POLYGON_API_KEY;
  if (!polyKey) return null;

  try {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    const from = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split("T")[0];

    // Get aggregates
    const aggUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&apiKey=${polyKey}`;
    const aggRes = await fetch(aggUrl, { signal: AbortSignal.timeout(10000) });
    if (!aggRes.ok) return null;
    const aggData = await aggRes.json();
    const results = aggData.results || [];
    if (results.length === 0) return null;

    // Also get ticker details for name
    const detailUrl = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}?apiKey=${polyKey}`;
    const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(5000) });
    const detail = detailRes.ok ? await detailRes.json() : null;
    const tickerInfo = detail?.results || {};

    const closes = results.map((r: { c: number }) => r.c);
    const volumes = results.map((r: { v: number }) => r.v);
    const lastBar = results[results.length - 1];
    const prevBar = results.length > 1 ? results[results.length - 2] : null;

    return {
      meta: {
        symbol,
        shortName: tickerInfo.name || symbol,
        exchangeName: tickerInfo.primary_exchange || "Unknown",
        currency: tickerInfo.currency_name?.toUpperCase() || "USD",
        regularMarketPrice: lastBar.c,
        chartPreviousClose: prevBar?.c || lastBar.o,
        regularMarketDayHigh: lastBar.h,
        regularMarketDayLow: lastBar.l,
        regularMarketVolume: lastBar.v,
        marketCap: tickerInfo.market_cap || 0,
        instrumentType: "EQUITY",
      },
      closes,
      volumes,
    };
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const symbol = validateTicker(ticker);
  if (!symbol) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  // Rate limit
  const ip = getClientIp(_req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    // Try FMP first (most reliable), then Yahoo and Polygon as fallbacks
    let result = await fetchFromFMP(symbol);
    if (!result) {
      // Race Yahoo and Polygon as secondary sources
      const [yahoo, polygon] = await Promise.all([
        fetchFromYahoo(symbol).catch(() => null),
        fetchFromPolygon(symbol).catch(() => null),
      ]);
      result = yahoo || polygon || null;
    }

    if (!result) {
      return NextResponse.json(
        { error: `Data unavailable for "${symbol}". Try again shortly.` },
        { status: 502 }
      );
    }

    const { meta, closes, volumes } = result;
    const currentPrice = (meta.regularMarketPrice as number) || (closes.length > 0 ? closes[closes.length - 1] : 0);

    const prevClose = (() => {
      for (let i = closes.length - 1; i >= 0; i--) {
        if (Math.abs(closes[i] - currentPrice) > 0.02) return closes[i];
      }
      return (meta.chartPreviousClose as number) || (meta.previousClose as number) || currentPrice;
    })();

    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return NextResponse.json({
      ticker: (meta.symbol as string) || symbol,
      name: (meta.shortName as string) || (meta.longName as string) || symbol,
      exchange: (meta.exchangeName as string) || (meta.fullExchangeName as string) || "Unknown",
      currency: (meta.currency as string) || "USD",
      price: currentPrice,
      change: +change.toFixed(2),
      changePercent: +changePercent.toFixed(2),
      previousClose: prevClose,
      dayHigh: (meta.regularMarketDayHigh as number) || 0,
      dayLow: (meta.regularMarketDayLow as number) || 0,
      volume: (meta.regularMarketVolume as number) || (volumes.length > 0 ? volumes[volumes.length - 1] : 0),
      avgVolume: volumes.length > 5 ? Math.round(volumes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, volumes.length)) : 0,
      marketCap: (meta.marketCap as number) || 0,
      fiftyDayAvg: (meta.fiftyDayAverage as number) || 0,
      twoHundredDayAvg: (meta.twoHundredDayAverage as number) || 0,
      fiftyTwoWeekHigh: (meta.fiftyTwoWeekHigh as number) || 0,
      fiftyTwoWeekLow: (meta.fiftyTwoWeekLow as number) || 0,
      sparkline: closes.slice(-20),
      chartData: closes,
      instrumentType: (meta.instrumentType as string) || "EQUITY",
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { error: `Data temporarily unavailable for "${symbol}".` },
      { status: 502 }
    );
  }
}
