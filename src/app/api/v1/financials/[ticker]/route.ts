import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";

/** GET /api/v1/financials/:ticker — Full financial statements */
export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const auth = v1Auth(req, "read_research");
  if (!auth.ok) return auth.response;

  const { ticker: raw } = await params;
  const ticker = validateTicker(raw);
  if (!ticker) return v1Error("Invalid ticker", 400, "invalid_ticker");

  const period = req.nextUrl.searchParams.get("period") || "annual";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "4", 10), 20);

  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) {
    return v1Response({ ticker, period, statements: [], source: "demo", message: "Configure FMP_API_KEY for live data" }, auth.key, `/v1/financials/${ticker}`);
  }

  try {
    const [income, balance, cash] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=${period}&limit=${limit}&apikey=${fmpKey}`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => []),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=${period}&limit=${limit}&apikey=${fmpKey}`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => []),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${limit}&apikey=${fmpKey}`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => []),
    ]);
    return v1Response({ ticker, period, income, balance, cashFlow: cash, source: "live" }, auth.key, `/v1/financials/${ticker}`);
  } catch {
    return v1Error("Failed to fetch financials", 502, "upstream_error");
  }
}
