import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import {
  applyScenario,
  buildExtractionPrompt,
  buildSummaryPrompt,
} from "@/services/portfolio-sim.service";
import {
  prepareGatewayRequest,
  finalizeGatewayRequest,
  extractSemanticKey,
  MODEL_IDS,
} from "@/services/ai-cost-optimizer.service";
import type { SimScenario } from "@/services/portfolio-sim.service";
import type { PortfolioHolding } from "@/types/portfolio";

ensureEnv();

/**
 * POST /api/ai/portfolio-sim
 *
 * Takes a natural language query + holdings, extracts a scenario via Claude,
 * runs the simulation, and returns before/after comparison + AI summary.
 * Routed through AI Cost Optimizer for model selection + cost tracking.
 *
 * Body: { query: string, holdings: PortfolioHolding[] }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.aiChat);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { query, holdings: rawHoldings } = body as Record<string, unknown>;

    if (typeof query !== "string" || query.length < 3 || query.length > 500) {
      return NextResponse.json(
        { error: "Query must be 3-500 characters" },
        { status: 400 }
      );
    }

    if (!Array.isArray(rawHoldings) || rawHoldings.length === 0) {
      return NextResponse.json(
        { error: "Holdings must be a non-empty array" },
        { status: 400 }
      );
    }

    const holdings = (rawHoldings as PortfolioHolding[]).slice(0, 50);
    const tickers = holdings.map((h) => h.ticker);
    const userId = ip;

    // ── Route through AI Cost Optimizer ──
    const gateway = prepareGatewayRequest({
      query: query as string,
      userId,
      plan: "PRO",
      endpoint: "/api/ai/portfolio-sim",
      forceModel: "sonnet", // Sim extraction + summary are sonnet-tier
    });

    if (!gateway.proceed && !gateway.cachedResponse) {
      return NextResponse.json(
        { error: gateway.error || "Rate limit exceeded" },
        { status: gateway.status || 429 }
      );
    }

    // If we have a cached sim result, return it
    if (gateway.cachedResponse) {
      try {
        const cached = JSON.parse(gateway.cachedResponse.content);
        return NextResponse.json(cached, {
          headers: {
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-AI-Cache": "hit",
          },
        });
      } catch {
        // Cache contained non-JSON, proceed with fresh call
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });
    const selectedModel = gateway.model || MODEL_IDS.sonnet;
    const startTime = Date.now();

    // Step 1: Extract scenario from natural language
    const extractionPrompt = buildExtractionPrompt(query as string, tickers);
    const extractionRes = await client.messages.create({
      model: selectedModel,
      max_tokens: 200,
      messages: [{ role: "user", content: extractionPrompt }],
    });

    const extractedText = extractionRes.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Track extraction call
    finalizeGatewayRequest({
      cacheKey: "",
      response: extractedText,
      model: selectedModel,
      modelTier: "sonnet",
      inputTokens: extractionRes.usage?.input_tokens ?? 0,
      outputTokens: extractionRes.usage?.output_tokens ?? 0,
      userId,
      endpoint: "/api/ai/portfolio-sim:extract",
      ticker: null,
      queryKeywords: ["sim", "extract"],
      latencyMs: Date.now() - startTime,
      skipCache: true,
    });

    let scenario: SimScenario;
    try {
      const cleaned = extractedText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      scenario = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse scenario from query. Try rephrasing." },
        { status: 422 }
      );
    }

    // Step 2: Apply scenario and calculate
    const result = applyScenario(holdings, scenario);

    // Step 3: Generate AI summary
    const summaryPrompt = buildSummaryPrompt(query as string, result);
    const summaryStart = Date.now();
    let summary = "";
    try {
      const summaryRes = await client.messages.create({
        model: selectedModel,
        max_tokens: 300,
        messages: [{ role: "user", content: summaryPrompt }],
      });
      summary = summaryRes.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      // Track summary call
      finalizeGatewayRequest({
        cacheKey: "",
        response: summary,
        model: selectedModel,
        modelTier: "sonnet",
        inputTokens: summaryRes.usage?.input_tokens ?? 0,
        outputTokens: summaryRes.usage?.output_tokens ?? 0,
        userId,
        endpoint: "/api/ai/portfolio-sim:summary",
        ticker: null,
        queryKeywords: ["sim", "summary"],
        latencyMs: Date.now() - summaryStart,
        skipCache: true,
      });
    } catch {
      summary = `Scenario: ${scenario.description}. Portfolio would ${result.delta.totalValuePercent >= 0 ? "gain" : "lose"} ${Math.abs(result.delta.totalValuePercent)}% ($${Math.abs(result.delta.totalValue).toLocaleString()}).`;
    }

    const responseBody = {
      query,
      scenario: result.scenario,
      before: result.before,
      after: result.after,
      delta: result.delta,
      summary,
    };

    // Cache the full response for this scenario query
    const semantic = extractSemanticKey(query as string);
    finalizeGatewayRequest({
      cacheKey: gateway.cacheKey,
      response: JSON.stringify(responseBody),
      model: selectedModel,
      modelTier: "sonnet",
      inputTokens: 0,
      outputTokens: 0,
      userId,
      endpoint: "/api/ai/portfolio-sim",
      ticker: semantic.ticker,
      queryKeywords: semantic.keywords,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json(responseBody, {
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-AI-Model": selectedModel,
        "X-AI-Cache": "miss",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Simulation failed" },
      { status: 500 }
    );
  }
}
