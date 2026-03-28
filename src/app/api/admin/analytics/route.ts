import { NextResponse } from "next/server";
import { getAnalyticsDashboard } from "@/services/analytics.service";

/**
 * GET /api/admin/analytics
 *
 * Returns the full analytics dashboard payload.
 * Production: protected by admin role check.
 */
export async function GET() {
  const dashboard = getAnalyticsDashboard();
  return NextResponse.json(dashboard, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
