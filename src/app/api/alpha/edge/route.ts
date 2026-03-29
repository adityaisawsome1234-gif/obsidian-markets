import { NextResponse } from "next/server";
import {
  getClosedTrades,
  listTrades,
  computeAllPatternStats,
  buildEdgeSnapshot,
  getRecommendationStats,
} from "@/services/alpha-engine";
import type { EdgeSummary } from "@/types/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET() {
  const { trades: allTrades } = listTrades(DEMO_USER_ID, { limit: 10000 });
  const closedTrades = getClosedTrades(DEMO_USER_ID);
  const patternStats = computeAllPatternStats(closedTrades);
  const recStats = getRecommendationStats(DEMO_USER_ID);

  const snapshot = buildEdgeSnapshot(DEMO_USER_ID, allTrades, patternStats, recStats);

  // Determine personalization confidence
  let personalizationConfidence: EdgeSummary["personalizationConfidence"] = "cold_start";
  if (closedTrades.length >= 20) personalizationConfidence = "high";
  else if (closedTrades.length >= 10) personalizationConfidence = "medium";
  else if (closedTrades.length >= 5) personalizationConfidence = "low";

  const sectorPerformance = patternStats
    .filter(p => p.groupType === "sector")
    .sort((a, b) => b.avgReturn - a.avgReturn);

  const summary: EdgeSummary = {
    overallWinRate: snapshot.overallWinRate,
    overallAvgReturn: snapshot.overallAvgReturn,
    totalTrades: snapshot.totalTrades,
    totalClosedTrades: snapshot.totalClosedTrades,
    bestSetups: snapshot.bestSetups,
    worstSetups: snapshot.worstSetups,
    sectorPerformance,
    recommendationStats: recStats,
    insights: snapshot.behavioralInsights,
    personalizationConfidence,
  };

  return NextResponse.json(summary);
}
