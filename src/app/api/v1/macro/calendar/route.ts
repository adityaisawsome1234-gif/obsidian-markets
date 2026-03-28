import { NextRequest } from "next/server";
import { v1Auth, v1Response } from "@/lib/api-v1";

/** GET /api/v1/macro/calendar — Economic calendar */
export async function GET(req: NextRequest) {
  const auth = v1Auth(req, "read_market");
  if (!auth.ok) return auth.response;

  return v1Response({
    source: "demo",
    events: [
      { date: "2026-03-25", time: "10:00", event: "Consumer Confidence", actual: null, forecast: "104.5", prior: "106.7", impact: "medium" },
      { date: "2026-03-26", time: "08:30", event: "GDP (Q4 Final)", actual: null, forecast: "3.2%", prior: "3.2%", impact: "high" },
      { date: "2026-03-27", time: "08:30", event: "PCE Price Index", actual: null, forecast: "2.5%", prior: "2.6%", impact: "high" },
      { date: "2026-03-28", time: "10:00", event: "Michigan Sentiment", actual: null, forecast: "76.5", prior: "76.9", impact: "medium" },
      { date: "2026-04-01", time: "10:00", event: "ISM Manufacturing", actual: null, forecast: "50.5", prior: "50.3", impact: "high" },
      { date: "2026-04-04", time: "08:30", event: "Non-Farm Payrolls", actual: null, forecast: "200K", prior: "275K", impact: "high" },
    ],
  }, auth.key, "/v1/macro/calendar");
}
