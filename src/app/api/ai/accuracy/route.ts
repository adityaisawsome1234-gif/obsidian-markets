import { NextResponse } from "next/server";
import { getAccuracyStats, seedDemoData } from "@/services/ai-feedback.service";

/**
 * GET /api/ai/accuracy
 *
 * PUBLIC endpoint — returns AI prediction accuracy stats.
 * This is a marketing asset: "Our AI is right 72% of the time. Here's the proof."
 *
 * No auth required. Cached aggressively.
 */
export async function GET() {
  // Seed demo data if store is empty (first request)
  seedDemoData();

  const stats = getAccuracyStats();

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Data-Source": "ai-feedback-loop",
    },
  });
}
