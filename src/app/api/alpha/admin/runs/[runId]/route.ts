import { NextRequest, NextResponse } from "next/server";
import { getAllRuns, getRecommendationsByRun } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const runs = getAllRuns(DEMO_USER_ID);
  const run = runs.find(r => r.id === runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const items = getRecommendationsByRun(runId);

  const resolved = items.filter(i => i.outcomeStatus !== "pending" && i.outcomeStatus !== "expired");
  const outcomeStats = {
    pending: items.filter(i => i.outcomeStatus === "pending").length,
    wins: resolved.filter(i => i.outcomeStatus === "win").length,
    losses: resolved.filter(i => i.outcomeStatus === "loss").length,
    breakeven: resolved.filter(i => i.outcomeStatus === "breakeven").length,
    expired: items.filter(i => i.outcomeStatus === "expired").length,
    avgReturn: resolved.length > 0
      ? Math.round(resolved.reduce((s, i) => s + (i.outcomeReturnPercent ?? 0), 0) / resolved.length * 100) / 100
      : 0,
  };

  return NextResponse.json({
    run,
    items,
    outcomeStats,
  });
}
