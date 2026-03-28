import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";

/** GET /api/v1/options/flow/:ticker — Ticker-specific flow */
export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const auth = v1Auth(req, "options_flow");
  if (!auth.ok) return auth.response;

  const { ticker: raw } = await params;
  const ticker = validateTicker(raw);
  if (!ticker) return v1Error("Invalid ticker", 400, "invalid_ticker");

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/options/flow/history/${ticker}`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return v1Response({ ticker, ...data }, auth.key, `/v1/options/flow/${ticker}`);
  } catch {
    return v1Response({ ticker, flow: [], source: "demo" }, auth.key, `/v1/options/flow/${ticker}`);
  }
}
