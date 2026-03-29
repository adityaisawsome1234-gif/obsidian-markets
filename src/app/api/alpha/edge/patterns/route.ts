import { NextRequest, NextResponse } from "next/server";
import { getClosedTrades, computeAllPatternStats } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(req: NextRequest) {
  const groupType = req.nextUrl.searchParams.get("groupType") ?? undefined;
  const sortBy = req.nextUrl.searchParams.get("sortBy") ?? "avgReturn";
  const order = req.nextUrl.searchParams.get("order") ?? "desc";

  const closedTrades = getClosedTrades(DEMO_USER_ID);
  let patterns = computeAllPatternStats(closedTrades);

  if (groupType) {
    patterns = patterns.filter(p => p.groupType === groupType);
  }

  // Sort
  const sortKey = sortBy as keyof typeof patterns[0];
  patterns.sort((a, b) => {
    const aVal = (a as unknown as Record<string, number>)[sortKey] ?? 0;
    const bVal = (b as unknown as Record<string, number>)[sortKey] ?? 0;
    return order === "asc" ? aVal - bVal : bVal - aVal;
  });

  return NextResponse.json({ patterns, total: patterns.length });
}
