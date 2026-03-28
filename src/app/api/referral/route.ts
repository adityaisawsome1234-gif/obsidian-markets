import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import {
  getReferralStats,
  registerReferral,
  convertReferral,
  getReferralCode,
} from "@/services/referral.service";

/**
 * GET /api/referral — Get referral stats for the current user
 * POST /api/referral — Register a referral or convert one
 */

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  // In production, extract userId from session
  const userId = req.nextUrl.searchParams.get("userId") || ip;

  const stats = getReferralStats(userId);
  return NextResponse.json(stats);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await req.json();
    const { action, code, referredUserId } = body;

    if (action === "register" && code && referredUserId) {
      const referral = registerReferral(code, referredUserId);
      if (!referral) {
        return NextResponse.json(
          { error: "Invalid referral code or self-referral" },
          { status: 400 }
        );
      }
      return NextResponse.json({ status: "registered", referral });
    }

    if (action === "convert" && referredUserId) {
      const referrerId = convertReferral(referredUserId);
      if (!referrerId) {
        return NextResponse.json(
          { error: "No pending referral found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ status: "converted", referrerId });
    }

    if (action === "getCode") {
      const userId = body.userId || ip;
      const refCode = getReferralCode(userId);
      return NextResponse.json({ code: refCode, link: `https://obsidianmarkets.com/ref/${refCode}` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process referral" }, { status: 500 });
  }
}
