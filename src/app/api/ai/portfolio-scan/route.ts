import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import {
  buildPortfolioContext,
  scanPortfolioEvents,
  buildAlertPrompt,
} from "@/services/portfolio-ai.service";
import {
  prepareGatewayRequest,
  finalizeGatewayRequest,
  extractSemanticKey,
  MODEL_IDS,
} from "@/services/ai-cost-optimizer.service";
import type { PortfolioHolding } from "@/types/portfolio";

ensureEnv();

/**
 * POST /api/ai/portfolio-scan
 *
 * Runs the event scanner on the user's portfolio and returns
 * AI-generated personalized alerts for each detected event.
 * Routed through AI Cost Optimizer for model selection + tracking.
 *
 * Body: { holdings: PortfolioHolding[] }
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

    const { holdings: rawHoldings } = body as Record<string, unknown>;

    if (!Array.isArray(rawHoldings) || rawHoldings.length === 0) {
      return NextResponse.json(
        { error: "Holdings must be a non-empty array" },
        { status: 400 }
      );
    }

    const holdings = (rawHoldings as PortfolioHolding[]).slice(0, 50);

    // Build context + scan
    const ctx = await buildPortfolioContext(holdings, ip);
    const scanResult = scanPortfolioEvents(ctx);

    // If no alerts, return empty
    if (scanResult.alerts.length === 0) {
      return NextResponse.json({
        alerts: [],
        scannedAt: scanResult.scannedAt,
        message: "No portfolio events detected.",
      });
    }

    // Generate AI narratives for top alerts (max 5 to control cost)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const topAlerts = scanResult.alerts.slice(0, 5);

    if (!apiKey || apiKey.length < 10) {
      return NextResponse.json({
        alerts: topAlerts.map((a) => ({ ...a, narrative: null })),
        scannedAt: scanResult.scannedAt,
      });
    }

    const client = new Anthropic({ apiKey });
    const userId = ip;

    // Route through optimizer — portfolio alerts are medium complexity
    const gateway = prepareGatewayRequest({
      query: "portfolio scan alerts",
      userId,
      plan: "PRO",
      endpoint: "/api/ai/portfolio-scan",
      forceModel: "sonnet", // Alerts are always sonnet-tier
      skipCache: true, // Portfolio scans are always fresh
    });

    if (!gateway.proceed && !gateway.cachedResponse) {
      return NextResponse.json(
        { error: gateway.error || "Rate limit exceeded" },
        { status: gateway.status || 429 }
      );
    }

    const selectedModel = gateway.model || MODEL_IDS.sonnet;
    const startTime = Date.now();

    // Generate narratives in parallel
    const narratives = await Promise.allSettled(
      topAlerts.map(async (alert) => {
        const prompt = buildAlertPrompt(alert, ctx);
        try {
          const response = await client.messages.create({
            model: selectedModel,
            max_tokens: 200,
            messages: [{ role: "user", content: prompt }],
          });

          const text = response.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("");

          // Track each sub-call
          finalizeGatewayRequest({
            cacheKey: "",
            response: text,
            model: selectedModel,
            modelTier: "sonnet",
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
            userId,
            endpoint: "/api/ai/portfolio-scan",
            ticker: alert.ticker,
            queryKeywords: ["portfolio", "alert", alert.type],
            latencyMs: Date.now() - startTime,
            skipCache: true,
          });

          return text;
        } catch {
          return null;
        }
      })
    );

    const enrichedAlerts = topAlerts.map((alert, i) => ({
      ...alert,
      narrative:
        narratives[i].status === "fulfilled" ? narratives[i].value : null,
    }));

    return NextResponse.json({
      alerts: enrichedAlerts,
      scannedAt: scanResult.scannedAt,
      context: {
        totalValue: ctx.totalValue,
        totalUnrealizedPL: ctx.totalUnrealizedPL,
        portfolioBeta: ctx.riskMetrics.portfolioBeta,
        var95: ctx.riskMetrics.var95,
      },
    }, {
      headers: {
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-AI-Model": selectedModel,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Portfolio scan failed" },
      { status: 500 }
    );
  }
}
