import { NextResponse } from "next/server";
import { getAllRuns, getRecommendationsByRun, getRecommendationStats } from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET() {
  const runs = getAllRuns(DEMO_USER_ID);
  const stats = getRecommendationStats(DEMO_USER_ID);

  const runsWithSummary = runs.map(run => {
    const items = getRecommendationsByRun(run.id);
    const resolved = items.filter(i => i.outcomeStatus !== "pending" && i.outcomeStatus !== "expired");
    const wins = resolved.filter(i => i.outcomeStatus === "win").length;
    const losses = resolved.filter(i => i.outcomeStatus === "loss").length;
    const avgReturn = resolved.length > 0
      ? resolved.reduce((s, i) => s + (i.outcomeReturnPercent ?? 0), 0) / resolved.length
      : 0;

    return {
      run,
      itemCount: items.length,
      avgFinalScore: items.length > 0
        ? Math.round(items.reduce((s, i) => s + i.finalScore, 0) / items.length * 100) / 100
        : 0,
      outcomeStats: {
        pending: items.filter(i => i.outcomeStatus === "pending").length,
        wins,
        losses,
        breakeven: resolved.filter(i => i.outcomeStatus === "breakeven").length,
        expired: items.filter(i => i.outcomeStatus === "expired").length,
        avgReturn: Math.round(avgReturn * 100) / 100,
      },
    };
  });

  return NextResponse.json({
    runs: runsWithSummary,
    globalStats: stats,
  });
}
