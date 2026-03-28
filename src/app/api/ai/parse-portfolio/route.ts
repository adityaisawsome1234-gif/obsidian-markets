import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

ensureEnv();

/**
 * POST /api/ai/parse-portfolio
 *
 * Accepts a brokerage screenshot (multipart form data) and uses Claude's
 * vision capability to extract holdings (ticker, shares, avg cost).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.aiChat);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const formData = await req.formData();
    const file = formData.get("screenshot") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No screenshot provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `This is a screenshot of a brokerage account showing stock holdings. Extract every stock position visible.

Return ONLY valid JSON, no markdown, no explanation:
{
  "holdings": [
    { "ticker": "AAPL", "shares": 150, "avgCost": 178.50 },
    ...
  ],
  "broker": "name of brokerage if identifiable",
  "totalValue": number or null if visible
}

RULES:
- ticker must be the stock symbol (e.g., AAPL not Apple Inc.)
- shares must be a number (handle fractional shares)
- avgCost is the average cost basis per share. If not visible, estimate from current market value / shares, or use 0.
- If the image is not a brokerage screenshot or no holdings are visible, return {"holdings": [], "error": "Could not identify holdings"}
- Extract ALL visible positions, not just the first few`,
            },
          ],
        },
      ],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Parse response
    const cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json(data);
  } catch (e) {
    console.error("Portfolio parse error:", e);
    return NextResponse.json(
      { error: "Failed to parse screenshot", holdings: [] },
      { status: 500 }
    );
  }
}
