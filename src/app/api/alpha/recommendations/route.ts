import { NextRequest, NextResponse } from "next/server";
import { getLatestRecommendations } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");

  const { items, run } = getLatestRecommendations(DEMO_USER_ID, Math.min(limit, 50));

  return NextResponse.json({
    items,
    run,
    totalCount: items.length,
  });
}
