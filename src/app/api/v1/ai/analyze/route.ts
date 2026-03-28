import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { validateTicker } from "@/lib/validation";
import { COMPLIANCE_PREAMBLE, DISCLAIMER_SHORT, classifyRisk } from "@/services/ai-compliance.service";

/** POST /api/v1/ai/analyze — AI analysis of any ticker */
export async function POST(req: NextRequest) {
  const auth = v1Auth(req, "ai_query");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { ticker: rawTicker, question } = body as Record<string, string>;

    const ticker = validateTicker(rawTicker);
    if (!ticker) return v1Error("Invalid ticker", 400, "invalid_ticker");

    const prompt = question || `Provide a comprehensive analysis of ${ticker}`;
    if (prompt.length > 1000) return v1Error("Question too long (max 1000 chars)", 400, "input_too_long");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return v1Response({
        ticker, analysis: `${ticker} analysis requires ANTHROPIC_API_KEY configuration.`,
        riskLabel: "analysis", disclaimer: DISCLAIMER_SHORT, source: "demo",
      }, auth.key, "/v1/ai/analyze");
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are a senior equity research analyst. Provide dense, data-driven analysis.\n${COMPLIANCE_PREAMBLE}`,
      messages: [{ role: "user", content: `Analyze ${ticker}: ${prompt}` }],
    });

    const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
    const tokens = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0);
    const riskLabel = classifyRisk(prompt, text);

    return v1Response({
      ticker, analysis: text, riskLabel,
      tokens, model: "claude-sonnet-4-6",
      disclaimer: DISCLAIMER_SHORT,
    }, auth.key, "/v1/ai/analyze", tokens);
  } catch {
    return v1Error("Analysis failed", 500, "ai_error");
  }
}
