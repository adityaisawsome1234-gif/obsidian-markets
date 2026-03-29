import { NextRequest, NextResponse } from "next/server";
import {
  listTrades,
  getLatestRecommendations,
  generateWeeklyReport,
  getLatestWeeklyReport,
  getWeeklyReports,
} from "@/services/alpha-engine";

const DEMO_USER_ID = "demo_user";

export async function GET(req: NextRequest) {
  const generate = req.nextUrl.searchParams.get("generate") === "true";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");

  if (generate) {
    // Generate fresh report
    const { trades } = listTrades(DEMO_USER_ID, { limit: 10000 });
    const { items: allRecs } = getLatestRecommendations(DEMO_USER_ID, 1000);
    const report = generateWeeklyReport(DEMO_USER_ID, trades, allRecs);
    return NextResponse.json(report);
  }

  // Return existing reports
  const latest = getLatestWeeklyReport(DEMO_USER_ID);
  const history = getWeeklyReports(DEMO_USER_ID, Math.min(limit, 52));

  return NextResponse.json({
    latest,
    history,
  });
}
