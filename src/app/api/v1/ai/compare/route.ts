import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";
import { COMPLIANCE_PREAMBLE, DISCLAIMER_SHORT, classifyRisk } from "@/services/ai-compliance.service";

/** POST /api/v1/ai/compare — Compare two tickers */
export async function POST(req: NextRequest) {
  const auth = v1Auth(req, "ai_query");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { ticker1: raw1, ticker2: raw2, focus } = body as Record<string, string>;

    const t1 = validateTicker(raw1);
    const t2 = validateTicker(raw2);
    if (!t1 || !t2) return v1Error("Two valid tickers required (ticker1, ticker2)", 400, "invalid_ticker");

    const focusArea = focus || "valuation, growth, and risk";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return v1Response({
        ticker1: t1, ticker2: t2, comparison: "Configure ANTHROPIC_API_KEY for live AI.",
        riskLabel: "analysis", disclaimer: DISCLAIMER_SHORT, source: "demo",
      }, auth.key, "/v1/ai/compare");
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      system: `You are a senior equity analyst. Compare stocks with specific metrics, tables, and data.\n${COMPLIANCE_PREAMBLE}`,
      messages: [{ role: "user", content: `Compare ${t1} vs ${t2} on: ${focusArea}. Include a comparison table.` }],
    });

    const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
    const tokens = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0);

    return v1Response({
      ticker1: t1, ticker2: t2, comparison: text,
      riskLabel: classifyRisk(`compare ${t1} vs ${t2}`, text),
      tokens, model: "claude-sonnet-4-6", disclaimer: DISCLAIMER_SHORT,
    }, auth.key, "/v1/ai/compare", tokens);
  } catch {
    return v1Error("Comparison failed", 500, "ai_error");
  }
}
