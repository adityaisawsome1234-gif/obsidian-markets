import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";

/** GET /api/v1/options/chain/:ticker — Full options chain */
export async function GET(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const auth = v1Auth(req, "options_flow");
  if (!auth.ok) return auth.response;

  const { ticker: raw } = await params;
  const ticker = validateTicker(raw);
  if (!ticker) return v1Error("Invalid ticker", 400, "invalid_ticker");

  const expiry = req.nextUrl.searchParams.get("expiry");

  // Proxy to internal chain endpoint
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = new URL(`/api/options/${ticker}/chain`, base);
    if (expiry) url.searchParams.set("expiry", expiry);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return v1Response({ ticker, ...data, source: res.ok ? "live" : "demo" }, auth.key, `/v1/options/chain/${ticker}`);
  } catch {
    return v1Error("Failed to fetch options chain", 502, "upstream_error");
  }
}
