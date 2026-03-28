import { NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";

ensureEnv();

interface EarningsEvent {
  symbol: string;
  date: string;
  hour: string; // "bmo" | "amc" | "dmh"
  epsEstimate: number | null;
  revenueEstimate: number | null;
}

interface EconomicEvent {
  name: string;
  date: string;
  time: string;
  impact: "high" | "medium" | "low";
  estimate: string;
  prior: string;
}

export async function GET() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const earnings: EarningsEvent[] = [];
  const economic: EconomicEvent[] = [];

  // 1. Finnhub earnings calendar
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey && !finnhubKey.startsWith("your-")) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/calendar/earnings?from=${todayStr}&to=${weekEnd}&token=${finnhubKey}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        const items = data?.earningsCalendar || [];
        // Filter to well-known large-cap stocks
        const majorTickers = new Set([
          "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "NVDA", "TSLA", "BRK.B",
          "JPM", "V", "MA", "UNH", "JNJ", "PG", "HD", "BAC", "XOM", "CVX", "ABBV",
          "KO", "PEP", "MRK", "PFE", "LLY", "AVGO", "COST", "WMT", "DIS", "NFLX",
          "AMD", "CRM", "ORCL", "INTC", "QCOM", "TXN", "ADBE", "PYPL", "SQ", "SHOP",
          "UBER", "ABNB", "COIN", "RIVN", "LCID", "NIO", "PLTR", "SNAP", "PINS",
          "BA", "CAT", "GE", "MMM", "RTX", "LMT", "GS", "MS", "C", "WFC",
          "SBUX", "MCD", "NKE", "LULU", "TGT", "LOW", "F", "GM", "AAL", "DAL",
        ]);
        for (const item of items) {
          // Include major tickers OR any company with analyst coverage (has estimates)
          const isMajor = majorTickers.has(item.symbol);
          const hasCoverage = item.epsEstimate != null && item.revenueEstimate != null && item.revenueEstimate > 50_000_000;
          if (isMajor || hasCoverage) {
            earnings.push({
              symbol: item.symbol,
              date: item.date,
              hour: item.hour || "dmh",
              epsEstimate: item.epsEstimate ?? null,
              revenueEstimate: item.revenueEstimate ?? null,
            });
          }
        }
        // Sort by date, then alphabetically
        earnings.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
      }
    } catch { /* fall through */ }
  }

  // 2. FMP calendars as secondary source
  const fmpKey = process.env.FMP_API_KEY;
  if (fmpKey && !fmpKey.startsWith("your-")) {
    // FMP earnings (if Finnhub gave nothing)
    if (earnings.length === 0) {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/earning_calendar?from=${todayStr}&to=${weekEnd}&apikey=${fmpKey}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const item of data.slice(0, 20)) {
              if (item.symbol) {
                earnings.push({
                  symbol: item.symbol,
                  date: item.date,
                  hour: item.time === "bmo" ? "bmo" : item.time === "amc" ? "amc" : "dmh",
                  epsEstimate: item.epsEstimated ?? null,
                  revenueEstimate: item.revenueEstimated ?? null,
                });
              }
            }
          }
        }
      } catch { /* fall through */ }
    }

    // FMP economic calendar
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/economic_calendar?from=${todayStr}&to=${weekEnd}&apikey=${fmpKey}`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const usEvents = data.filter((e: { country?: string }) => e.country === "US");
          for (const item of usEvents.slice(0, 10)) {
            economic.push({
              name: (item.event || "").replace(" (United States)", "").replace(" (US)", ""),
              date: item.date?.split("T")[0] || "",
              time: item.date?.slice(11, 16) || "",
              impact: item.impact === "High" ? "high" : item.impact === "Medium" ? "medium" : "low",
              estimate: item.estimate != null ? String(item.estimate) : "",
              prior: item.actual != null ? String(item.actual) : item.previous != null ? String(item.previous) : "",
            });
          }
        }
      }
    } catch { /* fall through */ }
  }

  return NextResponse.json(
    { earnings: earnings.slice(0, 15), economic: economic.slice(0, 10) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
