import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";

/** GET /api/v1/earnings/:ticker — Earnings history + estimates */
export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const auth = v1Auth(req, "read_research");
  if (!auth.ok) return auth.response;

  const { ticker: raw } = await params;
  const ticker = validateTicker(raw);
  if (!ticker) return v1Error("Invalid ticker", 400, "invalid_ticker");

  return v1Response({
    ticker,
    source: "demo",
    history: [
      { quarter: "Q4 2025", date: "2026-01-28", epsActual: 2.18, epsEstimate: 2.10, surprise: 3.8, revenueActual: 94.8e9, revenueEstimate: 93.5e9 },
      { quarter: "Q3 2025", date: "2025-10-22", epsActual: 1.95, epsEstimate: 1.88, surprise: 3.7, revenueActual: 89.2e9, revenueEstimate: 87.8e9 },
      { quarter: "Q2 2025", date: "2025-07-24", epsActual: 1.82, epsEstimate: 1.79, surprise: 1.7, revenueActual: 85.1e9, revenueEstimate: 84.5e9 },
      { quarter: "Q1 2025", date: "2025-04-24", epsActual: 1.72, epsEstimate: 1.68, surprise: 2.4, revenueActual: 81.4e9, revenueEstimate: 80.9e9 },
    ],
    nextEarnings: { date: "2026-04-24", epsEstimate: 2.35, revenueEstimate: 98.2e9 },
  }, auth.key, `/v1/earnings/${ticker}`);
}
