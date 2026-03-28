import { NextRequest } from "next/server";
import { v1Auth, v1Response, v1Error } from "@/lib/api-v1";
import { COMPLIANCE_PREAMBLE, DISCLAIMER_FULL, classifyRisk } from "@/services/ai-compliance.service";

/** POST /api/v1/ai/portfolio-review — Analyze a portfolio */
export async function POST(req: NextRequest) {
  const auth = v1Auth(req, "portfolio_analytics");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { holdings } = body as { holdings: { ticker: string; shares: number; avgCost?: number }[] };

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return v1Error("holdings array required", 400, "invalid_input");
    }
    if (holdings.length > 100) {
      return v1Error("Max 100 holdings", 400, "input_too_large");
    }

    const holdingsSummary = holdings
      .slice(0, 50)
      .map(h => `${h.ticker}: ${h.shares} shares${h.avgCost ? ` @ $${h.avgCost}` : ""}`)
      .join("\n");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return v1Response({
        review: "Configure ANTHROPIC_API_KEY for live portfolio review.",
        holdingsCount: holdings.length,
        riskLabel: "analysis", disclaimer: DISCLAIMER_FULL, source: "demo",
      }, auth.key, "/v1/ai/portfolio-review");
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: `You are a portfolio risk analyst. Analyze the portfolio for concentration risk, sector exposure, correlation, and potential improvements. Use specific metrics.\n${COMPLIANCE_PREAMBLE}`,
      messages: [{ role: "user", content: `Review this portfolio:\n${holdingsSummary}\n\nAnalyze: sector concentration, correlation risk, diversification score, and key risk factors.` }],
    });

    const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
    const tokens = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0);

    return v1Response({
      review: text, holdingsCount: holdings.length,
      riskLabel: classifyRisk("portfolio review", text),
      tokens, model: "claude-sonnet-4-6", disclaimer: DISCLAIMER_FULL,
    }, auth.key, "/v1/ai/portfolio-review", tokens);
  } catch {
    return v1Error("Portfolio review failed", 500, "ai_error");
  }
}
