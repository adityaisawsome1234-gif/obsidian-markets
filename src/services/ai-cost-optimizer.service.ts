/**
 * AI Cost Optimization Layer
 *
 * Reduces average AI cost per query from ~$0.15 to ~$0.04 through:
 * 1. SemanticCache — cache by meaning, not exact query
 * 2. ModelRouter — route to cheapest sufficient model
 * 3. PrecomputeEngine — pre-generate common analyses off-peak
 * 4. CostTracker — per-user real-time spend tracking
 * 5. CostGuardrails — tier-based usage limits
 */

import { createHash } from "crypto";
import type { Plan } from "@/types/user";

/* ═══════════════════════════════════════════════════════
   1. SEMANTIC CACHE
   ═══════════════════════════════════════════════════════ */

export interface CacheEntry {
  response: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  ttl: number;
  queryKeywords: string[];
  ticker: string | null;
}

/** Keyword categories for semantic grouping */
/** Ordered from most specific to least — first match wins */
const QUESTION_TYPES: [string, readonly string[]][] = [
  ["deepdive", ["deep dive", "full analysis", "comprehensive", "detailed report", "research report"]],
  ["comparison", ["compare", "vs", "versus", "better than", "which is", "difference between"]],
  ["valuation", ["overvalued", "undervalued", "fair value", "worth", "valuation", "p/e", "pe ratio", "ev/ebitda", "dcf", "price target"]],
  ["technical", ["support", "resistance", "chart", "technical", "moving average", "rsi", "macd", "trend", "breakout", "pattern"]],
  ["fundamental", ["revenue", "earnings", "margin", "growth", "profit", "cash flow", "balance sheet", "debt", "dividend"]],
  ["sentiment", ["sentiment", "bullish", "bearish", "buy", "sell", "rating", "analyst", "short interest", "put/call"]],
  ["macro", ["fed", "interest rate", "inflation", "recession", "gdp", "unemployment", "yield curve", "macro"]],
  ["options", ["options", "calls", "puts", "iv", "implied volatility", "greeks", "expiration", "strike"]],
];

/**
 * Extract semantic keywords from a query for cache key generation.
 * Groups queries by ticker + question type so "Is NVDA overvalued?" and
 * "What's NVDA's valuation?" hit the same cache bucket.
 */
export function extractSemanticKey(query: string): {
  ticker: string | null;
  questionType: string;
  keywords: string[];
} {
  const lower = query.toLowerCase().trim();

  // Extract ticker (1-5 uppercase letters that look like tickers)
  const tickerMatch = query.match(/\b([A-Z]{1,5})\b/);
  const ticker = tickerMatch?.[1] ?? null;

  // Determine question type (ordered: first match wins)
  let questionType = "general";
  for (const [type, patterns] of QUESTION_TYPES) {
    if (patterns.some((p) => lower.includes(p))) {
      questionType = type;
      break;
    }
  }

  // Extract meaningful keywords (remove stop words)
  const STOP_WORDS = new Set([
    "what", "is", "the", "a", "an", "of", "to", "in", "for", "on", "with",
    "how", "does", "do", "can", "will", "would", "should", "could", "my",
    "me", "its", "it", "this", "that", "about", "tell", "explain", "give",
    "show", "why", "when", "where", "who", "which", "think", "you", "i",
    "are", "be", "been", "being", "was", "were", "has", "have", "had",
  ]);
  const keywords = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 8);

  return { ticker, questionType, keywords };
}

/**
 * Generate a data hash from market context to invalidate cache when data changes.
 * Uses price + a time bucket (30min during market hours, 4h after close).
 */
export function generateDataHash(
  ticker: string | null,
  price?: number,
  earningsDate?: string
): string {
  const now = new Date();
  const hour = now.getUTCHours();
  // Market hours: roughly 13:30-20:00 UTC (9:30-4 ET)
  const isMarketHours = hour >= 13 && hour <= 20;
  const timeBucket = isMarketHours
    ? Math.floor(now.getTime() / (30 * 60 * 1000)) // 30-min buckets
    : Math.floor(now.getTime() / (4 * 60 * 60 * 1000)); // 4-hour buckets

  const raw = `${ticker || "none"}:${price?.toFixed(1) ?? "na"}:${earningsDate ?? "na"}:${timeBucket}`;
  return createHash("md5").update(raw).digest("hex").slice(0, 12);
}

/** In-memory semantic cache (production: Redis) */
const semanticCache = new Map<string, CacheEntry>();

// Cleanup expired entries every 5 minutes
let cacheCleanupScheduled = false;
function scheduleCacheCleanup() {
  if (cacheCleanupScheduled) return;
  cacheCleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of semanticCache) {
      if (now > entry.createdAt + entry.ttl) {
        semanticCache.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();
}

export function buildCacheKey(
  ticker: string | null,
  questionType: string,
  dataHash: string
): string {
  return `ai:response:${ticker || "general"}:${questionType}:${dataHash}`;
}

export function getCachedResponse(cacheKey: string): CacheEntry | null {
  scheduleCacheCleanup();
  const entry = semanticCache.get(cacheKey);
  if (!entry) return null;

  // Check TTL
  if (Date.now() > entry.createdAt + entry.ttl) {
    semanticCache.delete(cacheKey);
    return null;
  }

  return entry;
}

export function setCachedResponse(
  cacheKey: string,
  entry: CacheEntry
): void {
  scheduleCacheCleanup();
  // Cap cache size at 2000 entries
  if (semanticCache.size >= 2000) {
    // Evict oldest entry
    const oldest = [...semanticCache.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    )[0];
    if (oldest) semanticCache.delete(oldest[0]);
  }
  semanticCache.set(cacheKey, entry);
}

/** Get current cache stats for monitoring */
export function getCacheStats(): {
  size: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
} {
  return {
    size: semanticCache.size,
    hitRate: cacheMetrics.total > 0
      ? cacheMetrics.hits / cacheMetrics.total
      : 0,
    totalHits: cacheMetrics.hits,
    totalMisses: cacheMetrics.misses,
  };
}

const cacheMetrics = { hits: 0, misses: 0, total: 0 };

export function recordCacheHit(): void {
  cacheMetrics.hits++;
  cacheMetrics.total++;
}

export function recordCacheMiss(): void {
  cacheMetrics.misses++;
  cacheMetrics.total++;
}

/* ═══════════════════════════════════════════════════════
   2. MODEL ROUTER
   ═══════════════════════════════════════════════════════ */

export type ModelTier = "skip" | "haiku" | "sonnet" | "opus";

export interface RoutingDecision {
  model: ModelTier;
  reason: string;
  complexityScore: number;
  estimatedCostCents: number;
}

/** Cost estimates per 1K tokens (input + output blended) */
const MODEL_COSTS_PER_1K: Record<ModelTier, number> = {
  skip: 0,
  haiku: 0.08,   // ~$0.25/MTok in, ~$1.25/MTok out blended
  sonnet: 0.9,   // ~$3/MTok in, ~$15/MTok out blended
  opus: 4.5,     // ~$15/MTok in, ~$75/MTok out blended
};

/** Map model tier to Anthropic model ID */
export const MODEL_IDS: Record<Exclude<ModelTier, "skip">, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
};

/** Simple factual lookups that don't need AI */
const FACTUAL_PATTERNS = [
  /^what(?:'s| is) (\w+)(?:'s)? (p\/e|pe ratio|market cap|price|eps|dividend|yield|beta|sector|industry)\??$/i,
  /^(\w+) (p\/e|pe ratio|market cap|price|eps|dividend yield|beta)\??$/i,
  /^show (?:me )?(\w+)(?:'s)? (financials|fundamentals|stats)\??$/i,
  /^current price (?:of )?(\w+)\??$/i,
  /^what'?s? (\w+)'?s? (p\/e|pe) ratio\??$/i,
  /^(\w+) (market cap|pe ratio|p\/e ratio)\??$/i,
];

/** Complexity scoring weights */
const COMPLEXITY_SIGNALS = {
  queryLength: { short: 0, medium: 1, long: 2, veryLong: 3 },
  deepDiveWords: ["deep dive", "full analysis", "comprehensive", "detailed report", "research report", "dcf model", "deep research"],
  comparisonWords: ["compare", "versus", "vs", "better than", "which is"],
  multiTicker: 2,  // bonus for multiple tickers
  questionMark: 0, // neutral
  opusWords: ["dcf", "monte carlo", "scenario analysis", "full model", "back-test", "backtest", "risk analysis"],
  simpleWords: ["what is", "define", "explain briefly", "quick summary", "tldr"],
};

/**
 * Score query complexity and route to the cheapest sufficient model.
 *
 * Scoring: 0-2 = skip/haiku, 3-5 = sonnet, 6+ = opus
 */
export function scoreComplexity(query: string): RoutingDecision {
  const lower = query.toLowerCase().trim();

  // Check if this is a simple factual lookup (no AI needed)
  for (const pattern of FACTUAL_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        model: "skip",
        reason: "Factual lookup — no AI needed",
        complexityScore: 0,
        estimatedCostCents: 0,
      };
    }
  }

  let score = 0;
  const reasons: string[] = [];

  // Query length
  if (lower.length < 30) {
    score += 0;
    reasons.push("short query");
  } else if (lower.length < 80) {
    score += 1;
    reasons.push("medium query");
  } else if (lower.length < 200) {
    score += 2;
    reasons.push("long query");
  } else {
    score += 3;
    reasons.push("very long query");
  }

  // Deep dive signals → opus (high boost to ensure score > 5)
  if (COMPLEXITY_SIGNALS.deepDiveWords.some((w) => lower.includes(w))) {
    score += 5;
    reasons.push("deep dive requested");
  }

  // Opus-tier keywords
  if (COMPLEXITY_SIGNALS.opusWords.some((w) => lower.includes(w))) {
    score += 3;
    reasons.push("complex analysis type");
  }

  // Simple question signals → haiku
  if (COMPLEXITY_SIGNALS.simpleWords.some((w) => lower.includes(w))) {
    score -= 2;
    reasons.push("simple question pattern");
  }

  // Comparison queries → sonnet minimum
  if (COMPLEXITY_SIGNALS.comparisonWords.some((w) => lower.includes(w))) {
    score += 2;
    reasons.push("comparison query");
  }

  // Multiple tickers mentioned
  const tickerMatches = query.match(/\b[A-Z]{1,5}\b/g);
  const uniqueTickers = new Set(tickerMatches?.filter((t) => t.length >= 2) || []);
  if (uniqueTickers.size > 2) {
    score += 2;
    reasons.push(`${uniqueTickers.size} tickers mentioned`);
  }

  // Clamp
  score = Math.max(0, score);

  // Route based on score
  let model: ModelTier;
  if (score <= 2) {
    model = "haiku";
  } else if (score <= 5) {
    model = "sonnet";
  } else {
    model = "opus";
  }

  // Estimate cost (assume ~500 input tokens, ~1500 output for chat)
  const estimatedTokensK = 2; // 2K tokens blended
  const estimatedCostCents = MODEL_COSTS_PER_1K[model] * estimatedTokensK;

  return {
    model,
    reason: reasons.join(", "),
    complexityScore: score,
    estimatedCostCents: Math.round(estimatedCostCents * 100) / 100,
  };
}

/* ── Routing Decision Log ── */

export interface RoutingLogEntry {
  timestamp: number;
  query: string;
  decision: RoutingDecision;
  userId: string;
  endpoint: string;
  cacheHit: boolean;
}

const routingLog: RoutingLogEntry[] = [];
const MAX_LOG_SIZE = 5000;

export function logRoutingDecision(entry: RoutingLogEntry): void {
  routingLog.push(entry);
  if (routingLog.length > MAX_LOG_SIZE) {
    routingLog.splice(0, routingLog.length - MAX_LOG_SIZE);
  }
}

export function getRoutingLog(limit = 100): RoutingLogEntry[] {
  return routingLog.slice(-limit);
}

/* ═══════════════════════════════════════════════════════
   3. PRECOMPUTE ENGINE
   ═══════════════════════════════════════════════════════ */

export interface PrecomputeJob {
  id: string;
  type: "stock_summary" | "daily_edge" | "sector_rotation" | "macro_weekly";
  ticker?: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  createdAt: number;
  completedAt?: number;
  cost?: number;
}

/** In-memory pre-compute store (production: Redis with 24h TTL) */
const precomputeStore = new Map<string, PrecomputeJob>();

/** Top watchlist tickers for pre-computation */
export const PRECOMPUTE_TICKERS = [
  "AAPL", "NVDA", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AMD",
  "JPM", "V", "MA", "UNH", "JNJ", "XOM", "BAC", "GS",
  "CRM", "NFLX", "DIS", "INTC",
];

export function getPrecomputedResult(
  type: PrecomputeJob["type"],
  ticker?: string
): string | null {
  const key = `${type}:${ticker || "all"}`;
  const job = precomputeStore.get(key);
  if (!job || job.status !== "completed" || !job.result) return null;

  // Check if stale (24h)
  if (Date.now() - job.createdAt > 24 * 60 * 60 * 1000) {
    precomputeStore.delete(key);
    return null;
  }

  return job.result;
}

export function setPrecomputedResult(
  type: PrecomputeJob["type"],
  result: string,
  ticker?: string,
  cost?: number
): void {
  const key = `${type}:${ticker || "all"}`;
  precomputeStore.set(key, {
    id: key,
    type,
    ticker,
    status: "completed",
    result,
    createdAt: Date.now(),
    completedAt: Date.now(),
    cost,
  });
}

/**
 * Build batch prompts for pre-computation.
 * In production, these would be sent via Anthropic's Batch API for 50% savings.
 */
export function buildPrecomputePrompts(): {
  type: PrecomputeJob["type"];
  ticker?: string;
  prompt: string;
}[] {
  const jobs: { type: PrecomputeJob["type"]; ticker?: string; prompt: string }[] = [];

  // Stock summaries for top 20 tickers
  for (const ticker of PRECOMPUTE_TICKERS) {
    jobs.push({
      type: "stock_summary",
      ticker,
      prompt: `Write a concise 3-paragraph market summary for ${ticker} covering: 1) Current price action and technical setup, 2) Recent fundamental developments, 3) Key catalysts and risk factors ahead. Be specific with numbers. Under 150 words.`,
    });
  }

  // Sector rotation analysis
  jobs.push({
    type: "sector_rotation",
    prompt: `Analyze current sector rotation patterns across the 11 GICS sectors. Which sectors are showing relative strength? Which are weakening? What does the rotation pattern suggest about the market cycle stage? Include specific ETF performance data. Under 200 words.`,
  });

  // Weekly macro summary
  jobs.push({
    type: "macro_weekly",
    prompt: `Write a weekly macro summary covering: Fed policy outlook, yield curve dynamics, inflation trajectory, employment trends, key economic releases this week, and cross-asset implications (DXY, oil, gold, credit spreads). Under 250 words.`,
  });

  return jobs;
}

export function getPrecomputeStats(): {
  totalJobs: number;
  completed: number;
  pending: number;
  totalCost: number;
} {
  let completed = 0;
  let pending = 0;
  let totalCost = 0;
  for (const job of precomputeStore.values()) {
    if (job.status === "completed") {
      completed++;
      totalCost += job.cost ?? 0;
    } else {
      pending++;
    }
  }
  return { totalJobs: precomputeStore.size, completed, pending, totalCost };
}

/* ═══════════════════════════════════════════════════════
   4. COST TRACKER
   ═══════════════════════════════════════════════════════ */

export interface AiUsageRecord {
  id: string;
  timestamp: number;
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // in cents
  endpoint: string;
  cacheHit: boolean;
  latencyMs: number;
}

export interface DailyUsageSummary {
  date: string; // YYYY-MM-DD
  userId: string;
  totalCalls: number;
  cacheHits: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostCents: number;
  modelBreakdown: Record<string, { calls: number; costCents: number }>;
}

/** In-memory usage log (production: PostgreSQL ai_usage_log table) */
const usageLog: AiUsageRecord[] = [];
const MAX_USAGE_LOG = 10_000;

/** Per-user daily aggregation */
const dailySummaries = new Map<string, DailyUsageSummary>();

function todayKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${date}:${userId}`;
}

export function trackAiUsage(record: Omit<AiUsageRecord, "id">): AiUsageRecord {
  const entry: AiUsageRecord = {
    ...record,
    id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  usageLog.push(entry);
  if (usageLog.length > MAX_USAGE_LOG) {
    usageLog.splice(0, usageLog.length - MAX_USAGE_LOG);
  }

  // Update daily summary
  const key = todayKey(record.userId);
  const existing = dailySummaries.get(key) || {
    date: new Date().toISOString().slice(0, 10),
    userId: record.userId,
    totalCalls: 0,
    cacheHits: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostCents: 0,
    modelBreakdown: {},
  };

  existing.totalCalls++;
  if (record.cacheHit) existing.cacheHits++;
  existing.totalInputTokens += record.inputTokens;
  existing.totalOutputTokens += record.outputTokens;
  existing.totalCostCents += record.estimatedCost;

  if (!existing.modelBreakdown[record.model]) {
    existing.modelBreakdown[record.model] = { calls: 0, costCents: 0 };
  }
  existing.modelBreakdown[record.model].calls++;
  existing.modelBreakdown[record.model].costCents += record.estimatedCost;

  dailySummaries.set(key, existing);

  return entry;
}

export function getUserDailySummary(userId: string): DailyUsageSummary | null {
  return dailySummaries.get(todayKey(userId)) ?? null;
}

export function getGlobalDailyStats(): {
  totalCalls: number;
  totalCostCents: number;
  cacheHitRate: number;
  modelDistribution: Record<string, number>;
  avgCostPerCallCents: number;
  uniqueUsers: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  let totalCalls = 0;
  let totalCost = 0;
  let totalHits = 0;
  const models: Record<string, number> = {};
  const users = new Set<string>();

  for (const [key, summary] of dailySummaries) {
    if (!key.startsWith(today)) continue;
    totalCalls += summary.totalCalls;
    totalCost += summary.totalCostCents;
    totalHits += summary.cacheHits;
    users.add(summary.userId);
    for (const [model, data] of Object.entries(summary.modelBreakdown)) {
      models[model] = (models[model] || 0) + data.calls;
    }
  }

  return {
    totalCalls,
    totalCostCents: Math.round(totalCost * 100) / 100,
    cacheHitRate: totalCalls > 0 ? totalHits / totalCalls : 0,
    modelDistribution: models,
    avgCostPerCallCents: totalCalls > 0
      ? Math.round((totalCost / totalCalls) * 100) / 100
      : 0,
    uniqueUsers: users.size,
  };
}

/** Estimate cost in cents for a model + token count */
export function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Per-token pricing in dollars
  const pricing: Record<string, { input: number; output: number }> = {
    haiku: { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
    sonnet: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    opus: { input: 5 / 1_000_000, output: 25 / 1_000_000 },
  };

  // Normalize model string to tier name (e.g. "claude-opus-4-20250115" -> "opus")
  const tier = model.includes("opus")
    ? "opus"
    : model.includes("haiku")
      ? "haiku"
      : "sonnet";

  const p = pricing[tier];
  const costDollars = inputTokens * p.input + outputTokens * p.output;
  return Math.round(costDollars * 100 * 100) / 100; // cents, 2 decimal places
}

/* ═══════════════════════════════════════════════════════
   5. COST GUARDRAILS
   ═══════════════════════════════════════════════════════ */

export interface TierLimits {
  maxCallsPerDay: number;
  maxDeepDivesPerMonth: number;
  allowedModels: ModelTier[];
  monthlyBudgetCents: number; // alert threshold
  label: string;
}

export const TIER_LIMITS: Record<Plan, TierLimits> = {
  FREE: {
    maxCallsPerDay: 10,
    maxDeepDivesPerMonth: 0,
    allowedModels: ["skip", "haiku", "sonnet"],
    monthlyBudgetCents: 50, // $0.50
    label: "Free",
  },
  STARTER: {
    maxCallsPerDay: 50,
    maxDeepDivesPerMonth: 5,
    allowedModels: ["skip", "haiku", "sonnet", "opus"],
    monthlyBudgetCents: 500, // $5
    label: "Starter",
  },
  PRO: {
    maxCallsPerDay: 200,
    maxDeepDivesPerMonth: 50,
    allowedModels: ["skip", "haiku", "sonnet", "opus"],
    monthlyBudgetCents: 2000, // $20
    label: "Pro",
  },
  ELITE: {
    maxCallsPerDay: -1, // unlimited
    maxDeepDivesPerMonth: -1,
    allowedModels: ["skip", "haiku", "sonnet", "opus"],
    monthlyBudgetCents: 5000, // $50 alert threshold
    label: "Elite",
  },
};

/** Per-user monthly deep dive counter (production: PostgreSQL) */
const monthlyDeepDives = new Map<string, { month: string; count: number }>();

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  upgradeMessage?: string;
  remainingCalls?: number;
  downgradeModel?: ModelTier;
}

/**
 * Check if a user is within their AI usage limits.
 */
export function checkGuardrails(
  userId: string,
  plan: Plan,
  requestedModel: ModelTier
): GuardrailResult {
  const limits = TIER_LIMITS[plan];

  // 1. Check daily call count
  const daily = getUserDailySummary(userId);
  const todayCalls = daily?.totalCalls ?? 0;

  if (limits.maxCallsPerDay > 0 && todayCalls >= limits.maxCallsPerDay) {
    return {
      allowed: false,
      reason: "daily_limit",
      upgradeMessage: plan === "FREE"
        ? `You've used your ${limits.maxCallsPerDay} free AI queries today. Upgrade to Starter for ${TIER_LIMITS.STARTER.maxCallsPerDay} queries/day including deep dive reports.`
        : plan === "STARTER"
          ? `You've hit your daily limit of ${limits.maxCallsPerDay} queries. Upgrade to Pro for ${TIER_LIMITS.PRO.maxCallsPerDay}/day with full Opus access.`
          : `You've reached your ${limits.maxCallsPerDay} query limit for today. Upgrade to Elite for unlimited access.`,
      remainingCalls: 0,
    };
  }

  // 2. Check if requested model is allowed
  if (!limits.allowedModels.includes(requestedModel)) {
    // Downgrade instead of blocking
    const fallback = requestedModel === "opus" ? "sonnet" : "haiku";
    return {
      allowed: true,
      reason: "model_downgrade",
      downgradeModel: fallback as ModelTier,
      remainingCalls: limits.maxCallsPerDay > 0
        ? limits.maxCallsPerDay - todayCalls - 1
        : undefined,
    };
  }

  // 3. Check deep dive limit for opus requests
  if (requestedModel === "opus" && limits.maxDeepDivesPerMonth > 0) {
    const monthKey = `${userId}:${new Date().toISOString().slice(0, 7)}`;
    const monthData = monthlyDeepDives.get(monthKey) || {
      month: new Date().toISOString().slice(0, 7),
      count: 0,
    };

    if (monthData.count >= limits.maxDeepDivesPerMonth) {
      return {
        allowed: true,
        reason: "deep_dive_limit",
        downgradeModel: "sonnet",
        remainingCalls: limits.maxCallsPerDay > 0
          ? limits.maxCallsPerDay - todayCalls - 1
          : undefined,
      };
    }

    // Increment deep dive count
    monthData.count++;
    monthlyDeepDives.set(monthKey, monthData);
  }

  // 4. Elite overspend monitoring
  if (plan === "ELITE" && daily) {
    // Check monthly spend (~30 days extrapolation)
    const projectedMonthlyCents = daily.totalCostCents * 30;
    if (projectedMonthlyCents > limits.monthlyBudgetCents) {
      // Don't block, just flag (in production: alert ops team)
      console.warn(
        `[AI-COST] Elite user ${userId} projected to exceed $${(limits.monthlyBudgetCents / 100).toFixed(2)}/month: $${(projectedMonthlyCents / 100).toFixed(2)} projected`
      );
    }
  }

  return {
    allowed: true,
    remainingCalls: limits.maxCallsPerDay > 0
      ? limits.maxCallsPerDay - todayCalls - 1
      : undefined,
  };
}

/* ═══════════════════════════════════════════════════════
   6. UNIFIED AI GATEWAY
   ═══════════════════════════════════════════════════════

   Chains: Guardrails → Cache → Router → Claude → Cache Store → Tracker
   ═══════════════════════════════════════════════════════ */

export interface GatewayRequest {
  query: string;
  userId: string;
  plan: Plan;
  endpoint: string;
  ticker?: string;
  price?: number;
  earningsDate?: string;
  /** Force a specific model (bypasses router) */
  forceModel?: ModelTier;
  /** Skip cache check */
  skipCache?: boolean;
  /** Additional system prompt */
  systemPrompt?: string;
  /** Max tokens */
  maxTokens?: number;
  /** Full messages array for multi-turn chat */
  messages?: { role: "user" | "assistant"; content: string }[];
  /** Whether this is a streaming request */
  stream?: boolean;
}

export interface GatewayResponse {
  content: string;
  model: string;
  cacheHit: boolean;
  cacheAge?: number; // minutes since cached
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  routingDecision: RoutingDecision;
  guardrailResult: GuardrailResult;
  latencyMs: number;
}

/**
 * Process a query through the full optimization pipeline.
 *
 * Returns a GatewayResponse for non-streaming requests.
 * For streaming, the caller should use the routing decision
 * and model selection but handle streaming externally.
 */
export function prepareGatewayRequest(req: GatewayRequest): {
  /** Whether to proceed with the AI call */
  proceed: boolean;
  /** If cached, the response */
  cachedResponse?: GatewayResponse;
  /** The resolved model to use */
  model: string;
  modelTier: ModelTier;
  /** Guardrail result */
  guardrail: GuardrailResult;
  /** Routing decision */
  routing: RoutingDecision;
  /** Cache key for storing response after call */
  cacheKey: string;
  /** Error message if blocked */
  error?: string;
  /** HTTP status code if blocked */
  status?: number;
} {
  const startTime = Date.now();

  // Step 1: Route the query
  const routing = req.forceModel
    ? {
        model: req.forceModel,
        reason: "forced",
        complexityScore: -1,
        estimatedCostCents: 0,
      }
    : scoreComplexity(req.query);

  // Step 2: Check guardrails
  const guardrail = checkGuardrails(req.userId, req.plan, routing.model);

  if (!guardrail.allowed) {
    return {
      proceed: false,
      model: "",
      modelTier: routing.model,
      guardrail,
      routing,
      cacheKey: "",
      error: guardrail.upgradeMessage || "Rate limit exceeded",
      status: 429,
    };
  }

  // Apply model downgrade if guardrails say so
  const effectiveModel = guardrail.downgradeModel || routing.model;

  // Step 3: Check semantic cache
  const semantic = extractSemanticKey(req.query);
  const dataHash = generateDataHash(
    req.ticker || semantic.ticker,
    req.price,
    req.earningsDate
  );
  const cacheKey = buildCacheKey(
    req.ticker || semantic.ticker,
    semantic.questionType,
    dataHash
  );

  if (!req.skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      recordCacheHit();

      const ageMs = Date.now() - cached.createdAt;

      // Log the routing decision
      logRoutingDecision({
        timestamp: Date.now(),
        query: req.query,
        decision: routing,
        userId: req.userId,
        endpoint: req.endpoint,
        cacheHit: true,
      });

      // Track usage (0 cost for cache hit)
      trackAiUsage({
        timestamp: Date.now(),
        userId: req.userId,
        model: cached.model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        endpoint: req.endpoint,
        cacheHit: true,
        latencyMs: Date.now() - startTime,
      });

      return {
        proceed: false,
        cachedResponse: {
          content: cached.response,
          model: cached.model,
          cacheHit: true,
          cacheAge: Math.round(ageMs / 60000),
          inputTokens: 0,
          outputTokens: 0,
          costCents: 0,
          routingDecision: routing,
          guardrailResult: guardrail,
          latencyMs: Date.now() - startTime,
        },
        model: cached.model,
        modelTier: effectiveModel,
        guardrail,
        routing,
        cacheKey,
      };
    }
    recordCacheMiss();
  }

  // Step 4: Check precomputed results
  if (semantic.ticker && !req.skipCache) {
    const precomputed = getPrecomputedResult("stock_summary", semantic.ticker);
    if (precomputed && semantic.questionType === "general") {
      logRoutingDecision({
        timestamp: Date.now(),
        query: req.query,
        decision: { ...routing, reason: "precomputed" },
        userId: req.userId,
        endpoint: req.endpoint,
        cacheHit: true,
      });

      trackAiUsage({
        timestamp: Date.now(),
        userId: req.userId,
        model: "precomputed",
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        endpoint: req.endpoint,
        cacheHit: true,
        latencyMs: Date.now() - startTime,
      });

      return {
        proceed: false,
        cachedResponse: {
          content: precomputed,
          model: "precomputed",
          cacheHit: true,
          cacheAge: 0,
          inputTokens: 0,
          outputTokens: 0,
          costCents: 0,
          routingDecision: routing,
          guardrailResult: guardrail,
          latencyMs: Date.now() - startTime,
        },
        model: "precomputed",
        modelTier: effectiveModel,
        guardrail,
        routing,
        cacheKey,
      };
    }
  }

  // Step 5: Resolve model ID
  const modelId = effectiveModel === "skip"
    ? MODEL_IDS.haiku // fallback for skip (shouldn't reach here normally)
    : MODEL_IDS[effectiveModel];

  // Log routing decision
  logRoutingDecision({
    timestamp: Date.now(),
    query: req.query,
    decision: routing,
    userId: req.userId,
    endpoint: req.endpoint,
    cacheHit: false,
  });

  return {
    proceed: true,
    model: modelId,
    modelTier: effectiveModel,
    guardrail,
    routing,
    cacheKey,
  };
}

/**
 * After a Claude call completes, store the result in cache and track usage.
 */
export function finalizeGatewayRequest(params: {
  cacheKey: string;
  response: string;
  model: string;
  modelTier: ModelTier;
  inputTokens: number;
  outputTokens: number;
  userId: string;
  endpoint: string;
  ticker: string | null;
  queryKeywords: string[];
  latencyMs: number;
  skipCache?: boolean;
}): { costCents: number; usageRecord: AiUsageRecord } {
  const costCents = estimateCostCents(params.model, params.inputTokens, params.outputTokens);

  // Store in cache
  if (!params.skipCache && params.response.length > 0) {
    const now = new Date();
    const hour = now.getUTCHours();
    const isMarketHours = hour >= 13 && hour <= 20;
    const ttl = isMarketHours ? 30 * 60 * 1000 : 4 * 60 * 60 * 1000;

    setCachedResponse(params.cacheKey, {
      response: params.response,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      createdAt: Date.now(),
      ttl,
      queryKeywords: params.queryKeywords,
      ticker: params.ticker,
    });
  }

  // Track usage
  const usageRecord = trackAiUsage({
    timestamp: Date.now(),
    userId: params.userId,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCost: costCents,
    endpoint: params.endpoint,
    cacheHit: false,
    latencyMs: params.latencyMs,
  });

  return { costCents, usageRecord };
}
