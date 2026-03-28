import { NextRequest } from "next/server";
import { v1Auth, v1Response } from "@/lib/api-v1";

/** GET /api/v1/options/flow — Unusual options activity (all tickers) */
export async function GET(req: NextRequest) {
  const auth = v1Auth(req, "options_flow");
  if (!auth.ok) return auth.response;

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/options/flow/smart`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    return v1Response(data, auth.key, "/v1/options/flow");
  } catch {
    return v1Response({ flow: [], source: "demo" }, auth.key, "/v1/options/flow");
  }
}
