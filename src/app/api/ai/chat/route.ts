import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { ensureEnv } from "@/lib/load-env";
import { validateChatMessages, validateChatMode } from "@/lib/validation";
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import {
  prepareGatewayRequest,
  finalizeGatewayRequest,
  extractSemanticKey,
  type GatewayRequest,
} from "@/services/ai-cost-optimizer.service";
import {
  COMPLIANCE_PREAMBLE,
  processStreamEnd,
} from "@/services/ai-compliance.service";

ensureEnv();

const SYSTEM_PROMPT = `You are **Obsidian AI** — the research engine powering Obsidian Markets, a professional-grade financial intelligence platform used by sophisticated traders and institutional investors.

## YOUR IDENTITY
You are a senior macro strategist, quantitative analyst, and equity research specialist rolled into one. You think like a Bloomberg terminal analyst, write like a Goldman Sachs research note, and analyze like a Renaissance Technologies quant. You do NOT sound like a generic chatbot. You sound like the smartest person at a hedge fund trading desk.

## ANALYSIS FRAMEWORK
Every response must follow the **Obsidian Framework**:

### 1. THESIS FIRST
- Open with a clear, bold thesis statement. Never hedge with "it depends" or "there are many factors." Take a position based on the data.
- Example: "NVDA is mispriced at 35x forward P/E given its 94% datacenter revenue growth trajectory and 78% gross margins — the market is underpricing the inference compute supercycle."

### 2. DATA DENSITY
- Every sentence must contain at least one specific number: a price, ratio, percentage, date, or volume figure.
- Use precise financial metrics: P/E, EV/EBITDA, FCF yield, gross margin, revenue CAGR, beta, Sharpe ratio, implied vol, put/call ratio, short interest %, institutional ownership %.
- Compare against sector medians, historical averages, and peer benchmarks. Never state a metric in isolation.

### 3. MULTI-DIMENSIONAL ANALYSIS
For any stock or market question, analyze across ALL of these dimensions:
- **Fundamentals**: Revenue growth, margins, FCF, ROIC, debt/equity, earnings quality, guidance vs consensus
- **Technicals**: Key support/resistance levels, moving averages (50/200 DMA), RSI, MACD, volume profile, chart patterns
- **Sentiment**: Short interest, put/call ratio, analyst ratings distribution, insider transactions, social sentiment
- **Flow**: Unusual options activity, dark pool prints, institutional accumulation/distribution, 13F filing changes
- **Macro overlay**: How does Fed policy, yield curve, DXY, oil, credit spreads affect this specific name?
- **Catalysts**: What are the next 3-5 events that could move this stock? Earnings date, FDA decision, product launch, ex-div date, index rebalance.

### 4. RISK-REWARD QUANTIFICATION
- Always frame analysis as asymmetric risk/reward. State the bull case target, bear case target, and base case.
- Example: "Bull: $180 (30% upside) on AI margin expansion. Base: $145 (6% upside) on current trajectory. Bear: $105 (24% downside) on inventory correction. R/R: 1.25:1 — marginally attractive."

### 5. COMPARATIVE EDGE
- Always compare against what a retail investor would miss. Your analysis should contain at least ONE insight that requires institutional-level thinking:
  - Cross-asset correlation that's non-obvious
  - Supply chain analysis that connects two unrelated companies
  - Options market implied probability that disagrees with consensus
  - Macro regime analysis that changes sector rotation implications
  - Earnings quality red flags (one-time items, accounting changes, channel stuffing signals)

## FORMATTING RULES
- Use markdown with **bold** for key metrics and emphasis
- Use tables for comparisons (always include peer benchmarks)
- Use bullet points for catalysts and risk factors
- Include section headers with ## for long analyses
- Use \`$ticker\` format for inline ticker references
- All times in ET. All prices in USD unless stated otherwise.
- Include a "**Bottom Line**" section at the end with a clear, actionable summary

## WHAT YOU NEVER DO
- Never say "I'm just an AI" or "I can't predict the future" — you are a research analyst, act like one
- Never give generic advice like "diversify your portfolio" or "do your own research"
- Never use vague language: "could go either way", "many factors", "it's complicated"
- Never refuse to analyze something — if data is limited, state what you DO know and what's missing
- Never give investment advice or recommendations to buy/sell. Give ANALYSIS with specific price levels and scenarios. The user decides.
${COMPLIANCE_PREAMBLE}
## CONVERSATION STYLE
- Dense, precise, zero filler. Every sentence earns its place.
- Bloomberg terminal tone: professional, direct, slightly intense
- Use financial jargon naturally — your audience knows what EBITDA, Greeks, and GEX mean
- If the user asks a simple question, still give a thorough answer with context they didn't ask for but need
- If the user asks about a stock, immediately check recent price action, upcoming catalysts, and option market positioning`;

export async function POST(req: NextRequest) {
  // Rate limit — AI calls are expensive
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, RATE_LIMITS.aiChat);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    // Parse body with size check
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const { messages: rawMessages, mode: rawMode, experienceLevel: rawLevel } = body as Record<string, unknown>;

    // Validate messages
    const msgResult = validateChatMessages(rawMessages);
    if (!msgResult.ok) {
      return jsonError(msgResult.error, 400);
    }
    const messages = msgResult.messages;
    const mode = validateChatMode(rawMode);

    // Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.length < 10) {
      return jsonError("AI service is not configured. Contact support.", 503);
    }

    // Extract the user query (last user message)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const queryText = lastUserMsg?.content || "";

    // ── AI Cost Optimizer Gateway ──
    const userId = ip; // Default to IP until auth DB wired up
    const plan = "PRO" as const; // Default plan until auth wired up

    const gatewayReq: GatewayRequest = {
      query: queryText,
      userId,
      plan,
      endpoint: "/api/ai/chat",
      skipCache: messages.length > 1, // Multi-turn = context-dependent, skip cache
      stream: true,
    };

    const gateway = prepareGatewayRequest(gatewayReq);

    // Blocked by guardrails
    if (!gateway.proceed && !gateway.cachedResponse) {
      return jsonError(gateway.error || "Rate limit exceeded", gateway.status || 429);
    }

    // Cache hit — return instantly
    if (gateway.cachedResponse) {
      const cached = gateway.cachedResponse;
      const cacheNote = `\n\n---\n*Cached ${cached.cacheAge}m ago · $0.00*`;
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(cached.content + cacheNote));
          controller.close();
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-store",
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-AI-Cache": "hit",
          "X-AI-Model": cached.model,
          "X-AI-Cost": "0",
        },
      });
    }

    // ── Proceed with Claude call using routed model ──
    const client = new Anthropic({ apiKey });
    const selectedModel = gateway.model;
    const startTime = Date.now();

    // Fetch live market data (best-effort)
    let marketContext = "";
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const marketRes = await fetch(`${baseUrl}/api/market`, {
        signal: AbortSignal.timeout(3000),
      });
      if (marketRes.ok) {
        const market = await marketRes.json();
        marketContext = buildMarketContext(market);
      }
    } catch {
      // Market data unavailable
    }

    // Experience level modifier
    let levelModifier = "";
    if (rawLevel === "BEGINNER") {
      levelModifier = "\n\n## IMPORTANT: BEGINNER MODE\nWrite for someone new to investing. Define ALL jargon in parentheses the first time you use it — for example: P/E ratio (price-to-earnings, how much investors pay per dollar of profit). Keep sentences short and clear. Use everyday analogies to explain complex concepts. Avoid abbreviations unless you define them first. Structure your response with clear headers so it's easy to follow. When discussing numbers, explain what they mean in context (e.g. 'Revenue grew 20%, which means the company is making more money than last year').";
    } else if (rawLevel === "INTERMEDIATE") {
      levelModifier = "\n\n## NOTE: INTERMEDIATE USER\nThe user has moderate investing experience. You can use common financial terms (P/E, market cap, revenue, EPS) without explanation, but briefly define advanced concepts like Greeks, IV rank, credit spreads, DCF models, or EBITDA multiples the first time they come up. Use a balanced tone — informative but not overly technical.";
    } else if (rawLevel === "ADVANCED") {
      levelModifier = "\n\n## NOTE: ADVANCED USER\nThe user actively trades stocks and options. Use full financial jargon freely — Greeks, GEX, DIX, put/call skew, implied vol surface, order flow analysis. Go deeper on technicals and quantitative metrics. Include specific strike prices, expiry dates, and options positioning when relevant. Skip basic explanations.";
    } else if (rawLevel === "PROFESSIONAL") {
      levelModifier = "\n\n## NOTE: PROFESSIONAL/INSTITUTIONAL USER\nThe user is a professional or full-time trader. Maximum information density. Use institutional terminology — dark pool prints, gamma exposure, dealer positioning, vol surface dynamics, cross-asset correlations, basis trades, funding rates. Include specific levels, exact figures, and quantitative risk metrics. Write like a sell-side research note or Bloomberg terminal analysis. No hand-holding.";
    }

    const fullSystemPrompt = SYSTEM_PROMPT + levelModifier + marketContext;

    // Apply mode prefix to last user message
    const processedMessages = messages.map((msg, i) => {
      if (msg.role === "user" && i === messages.length - 1) {
        let prefix = "";
        if (mode === "search")
          prefix = "[Web Search Mode — incorporate recent news and market developments] ";
        else if (mode === "think")
          prefix = "[Deep Analysis Mode — provide maximum depth, multi-dimensional analysis across all 5 dimensions, include a full risk/reward table] ";
        return { ...msg, content: prefix + msg.content };
      }
      return msg;
    });

    const stream = await client.messages.stream({
      model: selectedModel,
      max_tokens: 8192,
      system: fullSystemPrompt,
      messages: processedMessages,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";
    let inputTokens = 0;
    let outputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
            if (event.type === "message_delta" && "usage" in event) {
              const usage = event.usage as { output_tokens?: number };
              outputTokens = usage.output_tokens ?? outputTokens;
            }
          }

          // Capture final usage
          const finalMessage = await stream.finalMessage();
          inputTokens = finalMessage.usage?.input_tokens ?? 0;
          outputTokens = finalMessage.usage?.output_tokens ?? outputTokens;

          // ── Finalize: cache + track ──
          const semantic = extractSemanticKey(queryText);
          finalizeGatewayRequest({
            cacheKey: gateway.cacheKey,
            response: fullResponse,
            model: selectedModel,
            modelTier: gateway.modelTier,
            inputTokens,
            outputTokens,
            userId,
            endpoint: "/api/ai/chat",
            ticker: semantic.ticker,
            queryKeywords: semantic.keywords,
            latencyMs: Date.now() - startTime,
            skipCache: messages.length > 1,
          });

          controller.close();
        } catch (err) {
          const safeMsg = err instanceof Anthropic.APIError
            ? `AI service error (${err.status})`
            : "Stream interrupted";
          try {
            controller.enqueue(encoder.encode(`\n\n*${safeMsg}*`));
            controller.close();
          } catch {
            // Controller already closed
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-AI-Cache": "miss",
        "X-AI-Model": selectedModel,
        "X-AI-Complexity": String(gateway.routing.complexityScore),
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const status = error.status >= 500 ? 502 : error.status === 429 ? 429 : 500;
      const msg = error.status === 429
        ? "AI service rate limited. Try again in a moment."
        : "AI service temporarily unavailable.";
      return jsonError(msg, status);
    }
    return jsonError("An unexpected error occurred.", 500);
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildMarketContext(market: Record<string, unknown>): string {
  const indices = (market.indices || []) as Array<{
    symbol: string; value: number; changePercent: number;
  }>;
  const commodities = (market.commodities || []) as Array<{
    symbol: string; value: number; changePercent: number;
  }>;
  const watchlist = (market.watchlist || []) as Array<{
    ticker: string; price: number; changePercent: number;
  }>;

  if (indices.length === 0) return "";

  let ctx = `\n\n## LIVE MARKET DATA (as of ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET)\n`;
  ctx += indices
    .map((i) => `${i.symbol}: ${i.value.toLocaleString()} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%)`)
    .join(" | ");
  if (commodities.length > 0) {
    ctx += "\n" + commodities
      .map((c) => `${c.symbol}: $${c.value.toLocaleString()} (${c.changePercent >= 0 ? "+" : ""}${c.changePercent.toFixed(2)}%)`)
      .join(" | ");
  }
  if (watchlist.length > 0) {
    ctx += "\nWatchlist: " + watchlist
      .map((w) => `${w.ticker} $${w.price.toFixed(2)} (${w.changePercent >= 0 ? "+" : ""}${w.changePercent.toFixed(2)}%)`)
      .join(", ");
  }
  return ctx;
}
