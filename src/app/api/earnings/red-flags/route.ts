import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

/**
 * GET /api/earnings/red-flags
 *
 * Returns today's earnings calls that have detected language red flags.
 * Red flags include: hedging language, topic avoidance, defensive responses,
 * vague guidance, and tone shifts from confident to evasive.
 *
 * This is a proprietary signal — the red flag detection requires our
 * historical dataset of transcript analysis patterns.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.stockData);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
    try {
      const resp = await fetch(
        `${backendUrl}/api/earnings/red-flags`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data?.earnings?.length > 0) {
          return NextResponse.json(data, { headers: { "X-Data-Source": "proprietary" } });
        }
      }
    } catch { /* backend unavailable */ }

    return NextResponse.json(buildDemoRedFlags(), {
      headers: { "X-Data-Source": "demo" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch red flags" }, { status: 500 });
  }
}

function buildDemoRedFlags() {
  const today = new Date().toISOString().slice(0, 10);

  return {
    date: today,
    dataSource: "demo",
    totalEarningsToday: 12,
    withRedFlags: 3,
    earnings: [
      {
        ticker: "XYZ",
        company: "XYZ Corp",
        quarter: "Q4 2025",
        date: today,
        confidenceScore: 4,
        toneDelta: -3,
        overallTone: "defensive",
        redFlags: [
          "CEO used 'challenging environment' 7 times vs 1 time last quarter",
          "CFO deflected two direct questions about margin guidance",
          "Management avoided discussing Q2 pipeline specifics despite analyst probing",
          "Introduced new risk language around 'customer concentration' not present in prior 4 filings",
        ],
        bearSignal: "Revenue guidance range widened by 2x vs prior quarter, signaling low visibility",
        bullSignal: "Backlog grew 12% QoQ despite revenue softness",
        analystConcernQuality: {
          strong: 1,
          adequate: 1,
          weak: 2,
          deflected: 1,
        },
      },
      {
        ticker: "ABC",
        company: "ABC Industries",
        quarter: "Q4 2025",
        date: today,
        confidenceScore: 5,
        toneDelta: -2,
        overallTone: "cautious",
        redFlags: [
          "Switched from specific revenue numbers to 'percentage growth' framing",
          "New hedging language: 'subject to macroeconomic conditions' added to every forward statement",
        ],
        bearSignal: "Gross margin compressed 180bps QoQ with no clear recovery timeline",
        bullSignal: "New product launch on track for Q2 with strong early customer interest",
        analystConcernQuality: {
          strong: 2,
          adequate: 2,
          weak: 1,
          deflected: 0,
        },
      },
      {
        ticker: "DEF",
        company: "DEF Technologies",
        quarter: "Q4 2025",
        date: today,
        confidenceScore: 3,
        toneDelta: -4,
        overallTone: "evasive",
        redFlags: [
          "CEO's prepared remarks were 40% shorter than prior 4 quarters",
          "3 analyst questions about competitive positioning received non-answers",
          "First mention of 'restructuring' in the company's earnings call history",
          "CFO declined to give specific EPS guidance for the first time in 12 quarters",
          "Used phrase 'right-sizing the organization' — typically precedes layoffs",
        ],
        bearSignal: "Confidence score dropped 4 points to 3/10 — historically, this magnitude of drop preceded negative guidance revision within 2 quarters 68% of the time",
        bullSignal: "Core product retention rate remained above 95%",
        analystConcernQuality: {
          strong: 0,
          adequate: 1,
          weak: 2,
          deflected: 3,
        },
      },
    ],
    insight: "3 of 12 earnings calls today show language red flags. DEF Technologies (3/10 confidence, -4 QoQ) is the most concerning — management evasiveness and shorter prepared remarks typically signal upcoming negative revisions in our dataset.",
  };
}
