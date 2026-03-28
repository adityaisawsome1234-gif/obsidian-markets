import { NextRequest } from "next/server";
import { v1Auth, v1Response } from "@/lib/api-v1";

/** GET /api/v1/macro/yields — Treasury yield curve */
export async function GET(req: NextRequest) {
  const auth = v1Auth(req, "read_market");
  if (!auth.ok) return auth.response;

  return v1Response({
    source: "demo",
    date: new Date().toISOString().slice(0, 10),
    yields: {
      "1M": 5.31, "3M": 5.24, "6M": 5.08, "1Y": 4.72,
      "2Y": 4.28, "3Y": 4.12, "5Y": 4.05, "7Y": 4.08,
      "10Y": 4.15, "20Y": 4.42, "30Y": 4.35,
    },
    spread_2_10: -0.13,
    spread_3m_10y: -1.09,
    inverted: true,
  }, auth.key, "/v1/macro/yields");
}
