import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { buildPortfolioContext } from "@/services/portfolio-ai.service";
import type { PortfolioHolding } from "@/types/portfolio";

ensureEnv();

/**
 * GET /api/ai/portfolio-context
 *
 * Returns the full enriched PortfolioContext for the user's holdings.
 * Holdings are passed as a query param (base64 encoded JSON) since
 * we don't have server-side auth/DB yet — client sends its state.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const holdingsParam = req.nextUrl.searchParams.get("holdings");
    if (!holdingsParam) {
      return NextResponse.json(
        { error: "Missing holdings parameter" },
        { status: 400 }
      );
    }

    let holdings: PortfolioHolding[];
    try {
      holdings = JSON.parse(atob(holdingsParam));
    } catch {
      return NextResponse.json(
        { error: "Invalid holdings data" },
        { status: 400 }
      );
    }

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: "Holdings must be a non-empty array" },
        { status: 400 }
      );
    }

    // Cap at 50 holdings to prevent abuse
    if (holdings.length > 50) {
      holdings = holdings.slice(0, 50);
    }

    const ctx = await buildPortfolioContext(holdings, ip);

    return NextResponse.json(ctx, {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        "X-RateLimit-Remaining": String(rl.remaining),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to build portfolio context" },
      { status: 500 }
    );
  }
}
