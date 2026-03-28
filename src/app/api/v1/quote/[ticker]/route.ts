import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";

/** GET /api/v1/quote/:ticker — Real-time quote */
export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const auth = v1Auth(req, "read_market");
  if (!auth.ok) return auth.response;

  const { ticker: raw } = await params;
  const ticker = validateTicker(raw);
  if (!ticker) return v1Error("Invalid ticker symbol", 400, "invalid_ticker");

  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) {
    return v1Response({
      ticker, price: 189.84, change: 2.34, changesPercentage: 1.25,
      dayHigh: 191.20, dayLow: 187.50, volume: 54_230_000,
      marketCap: 2_940_000_000_000, pe: 29.4, eps: 6.46,
      timestamp: new Date().toISOString(), source: "demo",
    }, auth.key, `/v1/quote/${ticker}`);
  }

  try {
    const res = await fetch(`https://financialmodelingprep.com/stable/quote/${ticker}?apikey=${fmpKey}`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const q = Array.isArray(data) ? data[0] : data;
    return v1Response({ ticker, ...q, source: "live" }, auth.key, `/v1/quote/${ticker}`);
  } catch {
    return v1Error("Failed to fetch quote", 502, "upstream_error");
  }
}
