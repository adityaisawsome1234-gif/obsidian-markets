/**
 * AI Feedback Loop & Quality Scoring
 *
 * Creates a compounding advantage: every user interaction makes the AI smarter.
 *
 * Subsystems:
 *   1. FeedbackStore     — collect + store user feedback per AI message
 *   2. PredictionTracker — extract verifiable claims, resolve against market data
 *   3. AccuracyEngine    — compute accuracy stats (directional, vol, earnings)
 *   4. PromptImprover    — weekly analysis of negative feedback → prompt fixes
 *
 * In-memory storage (production: PostgreSQL). Same interface so migration is
 * a single module swap.
 */

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;
export type FeedbackType =
  | "helpful"
  | "inaccurate"
  | "outdated"
  | "too_vague"
  | "too_complex"
  | "other";
export type ClaimType = "directional" | "volatility" | "event_impact" | "valuation";
export type ClaimOutcome = "correct" | "incorrect" | "partial" | "pending";

export interface AiFeedback {
  id: string;
  userId: string;
  messageId: string;
  rating: FeedbackRating;
  feedbackType: FeedbackType;
  comment: string | null;
  context: FeedbackContext;
  createdAt: string;
}

export interface FeedbackContext {
  query: string;
  ticker: string | null;
  endpoint: string;
  model: string;
  responsePreview: string;  // first 200 chars of AI response
}

export interface AiPrediction {
  id: string;
  briefingId: string;   // which Daily Edge or deep dive
  claim: string;        // human-readable claim text
  claimType: ClaimType;
  ticker: string;
  direction: "bullish" | "bearish" | "neutral";
  metric: string;       // what we're predicting (price, IV, earnings beat)
  timeframe: string;    // "1d" | "5d" | "earnings" | "30d"
  madeAt: string;
  resolvedAt: string | null;
  outcome: ClaimOutcome;
  predictedValue: number | null;
  actualValue: number | null;
  error: number | null;  // actual - predicted
  createdAt: string;
}

export interface AccuracyStats {
  overall: {
    total: number;
    resolved: number;
    correct: number;
    incorrect: number;
    partial: number;
    pending: number;
    accuracy: number;            // correct / resolved * 100
    accuracyWithPartial: number; // (correct + 0.5*partial) / resolved * 100
    confidenceInterval: { low: number; high: number };
  };
  byCategory: Record<ClaimType, {
    total: number;
    resolved: number;
    correct: number;
    accuracy: number;
  }>;
  byTicker: { ticker: string; total: number; accuracy: number }[];
  trend: { period: string; accuracy: number; count: number }[];
  feedbackSummary: {
    totalFeedback: number;
    averageRating: number;
    byType: Record<FeedbackType, number>;
    recentNegative: { type: FeedbackType; comment: string | null; ticker: string | null }[];
  };
}

export interface PromptImprovementSuggestion {
  id: string;
  createdAt: string;
  category: string;
  issue: string;
  suggestedFix: string;
  feedbackCount: number;
  status: "pending" | "applied" | "rejected";
}

/* ═══════════════════════════════════════════════════════
   1. FEEDBACK STORE
   ═══════════════════════════════════════════════════════ */

/** In-memory feedback store (production → PostgreSQL) */
const feedbackStore: AiFeedback[] = [];

let feedbackIdCounter = 0;

export function submitFeedback(input: {
  userId: string;
  messageId: string;
  rating: FeedbackRating;
  feedbackType: FeedbackType;
  comment?: string;
  context: FeedbackContext;
}): AiFeedback {
  const feedback: AiFeedback = {
    id: `fb_${++feedbackIdCounter}`,
    userId: input.userId,
    messageId: input.messageId,
    rating: input.rating,
    feedbackType: input.feedbackType,
    comment: input.comment ?? null,
    context: input.context,
    createdAt: new Date().toISOString(),
  };
  feedbackStore.push(feedback);

  // Log for analysis
  logFeedback(feedback);
  return feedback;
}

export function getFeedbackForMessage(messageId: string): AiFeedback[] {
  return feedbackStore.filter((f) => f.messageId === messageId);
}

export function getUserFeedbackHistory(
  userId: string,
  limit = 50
): AiFeedback[] {
  return feedbackStore
    .filter((f) => f.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

function logFeedback(fb: AiFeedback): void {
  const emoji =
    fb.rating >= 4 ? "👍" : fb.rating <= 2 ? "👎" : "🤔";
  console.log(
    `[AI-Feedback] ${emoji} ${fb.feedbackType} | rating=${fb.rating} | ` +
    `ticker=${fb.context.ticker || "—"} | msg=${fb.messageId} | ` +
    `${fb.comment ? `"${fb.comment.slice(0, 60)}"` : "no comment"}`
  );
}

/* ═══════════════════════════════════════════════════════
   2. PREDICTION TRACKER
   ═══════════════════════════════════════════════════════ */

const predictionStore: AiPrediction[] = [];
let predictionIdCounter = 0;

/**
 * Extract verifiable claims from an AI briefing and store them.
 * In production, this calls Claude to parse claims from the text.
 * Here we provide the extraction prompt builder + manual registration.
 */
export function buildClaimExtractionPrompt(briefingText: string): string {
  return `You are a prediction auditor. Parse this AI-generated financial briefing and extract every verifiable prediction or claim.

Return ONLY valid JSON — an array of objects:
[
  {
    "claim": "Human-readable description of the claim",
    "claimType": "directional" | "volatility" | "event_impact" | "valuation",
    "ticker": "TICKER",
    "direction": "bullish" | "bearish" | "neutral",
    "metric": "What metric is being predicted (price, IV, earnings_beat, revenue)",
    "timeframe": "1d" | "5d" | "earnings" | "30d"
  }
]

RULES:
- Only extract VERIFIABLE claims with clear outcomes
- "NVDA could go up" is too vague — skip it
- "NVDA implied move suggests 8.2% upside" IS verifiable
- "Expect AAPL to beat earnings estimates" IS verifiable
- "Macro uncertainty persists" is NOT verifiable — skip it
- If no verifiable claims exist, return []

BRIEFING:
${briefingText}`;
}

/**
 * Register a prediction extracted from an AI briefing.
 */
export function trackPrediction(input: {
  briefingId: string;
  claim: string;
  claimType: ClaimType;
  ticker: string;
  direction: "bullish" | "bearish" | "neutral";
  metric: string;
  timeframe: string;
  predictedValue?: number;
}): AiPrediction {
  const prediction: AiPrediction = {
    id: `pred_${++predictionIdCounter}`,
    briefingId: input.briefingId,
    claim: input.claim,
    claimType: input.claimType,
    ticker: input.ticker.toUpperCase(),
    direction: input.direction,
    metric: input.metric,
    timeframe: input.timeframe,
    madeAt: new Date().toISOString(),
    resolvedAt: null,
    outcome: "pending",
    predictedValue: input.predictedValue ?? null,
    actualValue: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  predictionStore.push(prediction);
  return prediction;
}

/**
 * Resolve a prediction against actual market data.
 * Called by the daily scheduled resolver job.
 */
export function resolvePrediction(
  predictionId: string,
  outcome: ClaimOutcome,
  actualValue: number | null
): AiPrediction | null {
  const pred = predictionStore.find((p) => p.id === predictionId);
  if (!pred) return null;

  pred.outcome = outcome;
  pred.actualValue = actualValue;
  pred.resolvedAt = new Date().toISOString();
  if (actualValue !== null && pred.predictedValue !== null) {
    pred.error = actualValue - pred.predictedValue;
  }
  return pred;
}

/**
 * Get all unresolved predictions whose timeframe has elapsed.
 * The scheduled resolver calls this daily after market close.
 */
export function getUnresolvedPredictions(): AiPrediction[] {
  const now = Date.now();
  return predictionStore.filter((p) => {
    if (p.outcome !== "pending") return false;
    const madeAt = new Date(p.madeAt).getTime();
    const elapsed = now - madeAt;
    const msPerDay = 86_400_000;

    // Check if timeframe has elapsed
    switch (p.timeframe) {
      case "1d": return elapsed > msPerDay;
      case "5d": return elapsed > 5 * msPerDay;
      case "30d": return elapsed > 30 * msPerDay;
      case "earnings": return elapsed > 7 * msPerDay; // resolve 7d after earnings
      default: return elapsed > 5 * msPerDay;
    }
  });
}

/**
 * Get predictions for a specific ticker.
 */
export function getPredictions(opts?: {
  ticker?: string;
  claimType?: ClaimType;
  outcome?: ClaimOutcome;
  limit?: number;
}): AiPrediction[] {
  let results = [...predictionStore];
  if (opts?.ticker) results = results.filter((p) => p.ticker === opts.ticker!.toUpperCase());
  if (opts?.claimType) results = results.filter((p) => p.claimType === opts.claimType);
  if (opts?.outcome) results = results.filter((p) => p.outcome === opts.outcome);
  results.sort((a, b) => b.madeAt.localeCompare(a.madeAt));
  return results.slice(0, opts?.limit ?? 100);
}

/* ═══════════════════════════════════════════════════════
   3. ACCURACY ENGINE
   ═══════════════════════════════════════════════════════ */

/**
 * Compute comprehensive accuracy statistics.
 * This is the data that powers the public /ai/accuracy page.
 */
export function getAccuracyStats(): AccuracyStats {
  const all = [...predictionStore];
  const resolved = all.filter((p) => p.outcome !== "pending");
  const correct = resolved.filter((p) => p.outcome === "correct");
  const incorrect = resolved.filter((p) => p.outcome === "incorrect");
  const partial = resolved.filter((p) => p.outcome === "partial");
  const pending = all.filter((p) => p.outcome === "pending");

  const n = resolved.length;
  const p = n > 0 ? correct.length / n : 0;

  // Wilson score confidence interval (95%)
  const z = 1.96;
  const ci = n > 0
    ? wilsonInterval(correct.length, n, z)
    : { low: 0, high: 0 };

  // By category
  const categories: ClaimType[] = ["directional", "volatility", "event_impact", "valuation"];
  const byCategory = {} as Record<ClaimType, { total: number; resolved: number; correct: number; accuracy: number }>;
  for (const cat of categories) {
    const catAll = all.filter((p) => p.claimType === cat);
    const catResolved = catAll.filter((p) => p.outcome !== "pending");
    const catCorrect = catResolved.filter((p) => p.outcome === "correct");
    byCategory[cat] = {
      total: catAll.length,
      resolved: catResolved.length,
      correct: catCorrect.length,
      accuracy: catResolved.length > 0
        ? Math.round((catCorrect.length / catResolved.length) * 1000) / 10
        : 0,
    };
  }

  // By ticker (top 20)
  const tickerMap = new Map<string, { total: number; correct: number }>();
  for (const pred of resolved) {
    const entry = tickerMap.get(pred.ticker) || { total: 0, correct: 0 };
    entry.total++;
    if (pred.outcome === "correct") entry.correct++;
    tickerMap.set(pred.ticker, entry);
  }
  const byTicker = [...tickerMap.entries()]
    .map(([ticker, s]) => ({
      ticker,
      total: s.total,
      accuracy: Math.round((s.correct / s.total) * 1000) / 10,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Trend by month
  const monthMap = new Map<string, { total: number; correct: number }>();
  for (const pred of resolved) {
    const month = pred.madeAt.slice(0, 7); // YYYY-MM
    const entry = monthMap.get(month) || { total: 0, correct: 0 };
    entry.total++;
    if (pred.outcome === "correct") entry.correct++;
    monthMap.set(month, entry);
  }
  const trend = [...monthMap.entries()]
    .map(([period, s]) => ({
      period,
      accuracy: Math.round((s.correct / s.total) * 1000) / 10,
      count: s.total,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Feedback summary
  const totalFeedback = feedbackStore.length;
  const avgRating = totalFeedback > 0
    ? Math.round(feedbackStore.reduce((s, f) => s + f.rating, 0) / totalFeedback * 10) / 10
    : 0;

  const byType: Record<FeedbackType, number> = {
    helpful: 0, inaccurate: 0, outdated: 0, too_vague: 0, too_complex: 0, other: 0,
  };
  for (const fb of feedbackStore) {
    byType[fb.feedbackType] = (byType[fb.feedbackType] || 0) + 1;
  }

  const recentNegative = feedbackStore
    .filter((f) => f.rating <= 2)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((f) => ({
      type: f.feedbackType,
      comment: f.comment,
      ticker: f.context.ticker,
    }));

  return {
    overall: {
      total: all.length,
      resolved: n,
      correct: correct.length,
      incorrect: incorrect.length,
      partial: partial.length,
      pending: pending.length,
      accuracy: n > 0 ? Math.round(p * 1000) / 10 : 0,
      accuracyWithPartial: n > 0
        ? Math.round(((correct.length + partial.length * 0.5) / n) * 1000) / 10
        : 0,
      confidenceInterval: {
        low: Math.round(ci.low * 1000) / 10,
        high: Math.round(ci.high * 1000) / 10,
      },
    },
    byCategory,
    byTicker,
    trend,
    feedbackSummary: {
      totalFeedback,
      averageRating: avgRating,
      byType,
      recentNegative,
    },
  };
}

/** Wilson score interval — proper confidence interval for proportions */
function wilsonInterval(successes: number, trials: number, z: number): { low: number; high: number } {
  if (trials === 0) return { low: 0, high: 0 };
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const center = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials);
  return {
    low: Math.max(0, (center - spread) / denom),
    high: Math.min(1, (center + spread) / denom),
  };
}

/* ═══════════════════════════════════════════════════════
   4. PROMPT IMPROVER
   ═══════════════════════════════════════════════════════ */

const improvementSuggestions: PromptImprovementSuggestion[] = [];
let suggestionIdCounter = 0;

/**
 * Build a prompt for Claude Opus to analyze negative feedback patterns
 * and suggest prompt improvements. Called weekly.
 */
export function buildPromptImprovementPrompt(): string {
  const negativeFeedback = feedbackStore
    .filter((f) => f.rating <= 2)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);

  if (negativeFeedback.length < 5) {
    return ""; // Not enough data yet
  }

  // Group by type
  const grouped: Record<string, { count: number; examples: string[] }> = {};
  for (const fb of negativeFeedback) {
    const key = fb.feedbackType;
    if (!grouped[key]) grouped[key] = { count: 0, examples: [] };
    grouped[key].count++;
    if (grouped[key].examples.length < 5) {
      grouped[key].examples.push(
        `[${fb.context.ticker || "general"}] ${fb.comment || fb.context.query.slice(0, 100)}`
      );
    }
  }

  // Get accuracy problem areas
  const stats = getAccuracyStats();
  const weakAreas = Object.entries(stats.byCategory)
    .filter(([, s]) => s.accuracy < 60 && s.resolved >= 5)
    .map(([type, s]) => `${type}: ${s.accuracy}% accuracy (${s.resolved} predictions)`);

  return `You are an AI system prompt engineer for a financial intelligence platform.
Analyze the following user feedback data and suggest specific prompt improvements.

NEGATIVE FEEDBACK SUMMARY (last 100 negative ratings):
${Object.entries(grouped).map(([type, data]) =>
  `\n${type.toUpperCase()} (${data.count} reports):\n${data.examples.map((e) => `  - ${e}`).join("\n")}`
).join("\n")}

${weakAreas.length > 0 ? `\nLOW ACCURACY AREAS:\n${weakAreas.map((a) => `  - ${a}`).join("\n")}` : ""}

CURRENT AVERAGE RATING: ${stats.feedbackSummary.averageRating}/5
OVERALL PREDICTION ACCURACY: ${stats.overall.accuracy}%

Analyze the patterns and suggest 3-5 specific prompt improvements.
For each suggestion, provide:
1. The specific issue identified (with evidence from the data)
2. The exact prompt modification to fix it
3. Expected impact on user satisfaction

Return JSON array:
[
  {
    "category": "string (e.g., 'small_cap_coverage', 'directional_claims', 'language_complexity')",
    "issue": "string — specific problem identified with evidence",
    "suggestedFix": "string — exact prompt modification",
    "feedbackCount": number
  }
]

Be specific. Reference actual feedback examples. Propose concrete prompt text, not vague suggestions.`;
}

/**
 * Store a prompt improvement suggestion (from Claude analysis).
 */
export function addImprovementSuggestion(input: {
  category: string;
  issue: string;
  suggestedFix: string;
  feedbackCount: number;
}): PromptImprovementSuggestion {
  const suggestion: PromptImprovementSuggestion = {
    id: `imp_${++suggestionIdCounter}`,
    createdAt: new Date().toISOString(),
    category: input.category,
    issue: input.issue,
    suggestedFix: input.suggestedFix,
    feedbackCount: input.feedbackCount,
    status: "pending",
  };
  improvementSuggestions.push(suggestion);
  return suggestion;
}

export function getImprovementSuggestions(
  status?: "pending" | "applied" | "rejected"
): PromptImprovementSuggestion[] {
  if (status) return improvementSuggestions.filter((s) => s.status === status);
  return [...improvementSuggestions];
}

export function updateSuggestionStatus(
  id: string,
  status: "applied" | "rejected"
): boolean {
  const s = improvementSuggestions.find((s) => s.id === id);
  if (!s) return false;
  s.status = status;
  return true;
}

/* ═══════════════════════════════════════════════════════
   5. DEMO DATA SEEDER
   ═══════════════════════════════════════════════════════ */

/**
 * Seed demo data for the public accuracy dashboard.
 * Called when no real data exists yet.
 */
export function seedDemoData(): void {
  if (predictionStore.length > 0) return; // Already seeded

  const tickers = ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "JPM", "V", "UNH"];
  const claimTypes: ClaimType[] = ["directional", "volatility", "event_impact", "valuation"];
  const directions: ("bullish" | "bearish" | "neutral")[] = ["bullish", "bearish", "neutral"];

  // Generate 180 predictions over 6 months with ~72% accuracy
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() - 6);

  for (let i = 0; i < 180; i++) {
    const date = new Date(baseDate.getTime() + i * 86_400_000);
    const ticker = tickers[i % tickers.length];
    const claimType = claimTypes[i % claimTypes.length];
    const direction = directions[i % directions.length];

    // 72% correct, 8% partial, 20% incorrect
    const roll = Math.random();
    const outcome: ClaimOutcome = roll < 0.72 ? "correct" : roll < 0.80 ? "partial" : "incorrect";

    // Last 10 predictions are still pending
    const isPending = i >= 170;

    const pred: AiPrediction = {
      id: `pred_demo_${i}`,
      briefingId: `brief_${Math.floor(i / 3)}`,
      claim: buildDemoClaim(ticker, claimType, direction),
      claimType,
      ticker,
      direction,
      metric: claimType === "directional" ? "price" : claimType === "volatility" ? "IV" : "earnings_beat",
      timeframe: claimType === "event_impact" ? "earnings" : "5d",
      madeAt: date.toISOString(),
      resolvedAt: isPending ? null : new Date(date.getTime() + 5 * 86_400_000).toISOString(),
      outcome: isPending ? "pending" : outcome,
      predictedValue: null,
      actualValue: null,
      error: null,
      createdAt: date.toISOString(),
    };
    predictionStore.push(pred);
  }

  // Seed some feedback
  const feedbackTypes: FeedbackType[] = ["helpful", "inaccurate", "outdated", "too_vague", "too_complex"];
  for (let i = 0; i < 60; i++) {
    const date = new Date(baseDate.getTime() + i * 2 * 86_400_000);
    const ticker = tickers[i % tickers.length];
    // 70% positive (4-5), 20% neutral (3), 10% negative (1-2)
    const roll = Math.random();
    const rating: FeedbackRating = roll < 0.70 ? 5 : roll < 0.90 ? 3 : 1;
    const type = rating === 5 ? "helpful" : feedbackTypes[i % feedbackTypes.length];

    const fb: AiFeedback = {
      id: `fb_demo_${i}`,
      userId: `user_${(i % 15) + 1}`,
      messageId: `msg_${i}`,
      rating,
      feedbackType: type,
      comment: rating <= 2 ? NEGATIVE_COMMENTS[i % NEGATIVE_COMMENTS.length] : null,
      context: {
        query: `Analysis of ${ticker}`,
        ticker,
        endpoint: "/api/ai/chat",
        model: "claude-sonnet-4-6",
        responsePreview: `${ticker} shows strong momentum...`,
      },
      createdAt: date.toISOString(),
    };
    feedbackStore.push(fb);
  }
}

function buildDemoClaim(ticker: string, type: ClaimType, dir: "bullish" | "bearish" | "neutral"): string {
  const claims: Record<ClaimType, string[]> = {
    directional: [
      `${ticker} likely to move ${dir === "bullish" ? "higher" : "lower"} over the next 5 trading days based on technical setup`,
      `${ticker} momentum suggests ${dir === "bullish" ? "upside" : "downside"} continuation`,
    ],
    volatility: [
      `${ticker} implied volatility appears ${dir === "bearish" ? "elevated" : "compressed"}, expecting mean reversion`,
      `${ticker} options pricing suggests ${dir === "bullish" ? "larger" : "smaller"} move than historical average`,
    ],
    event_impact: [
      `${ticker} likely to ${dir === "bullish" ? "beat" : "miss"} earnings consensus`,
      `${ticker} guidance revision expected to be ${dir === "bullish" ? "positive" : "negative"}`,
    ],
    valuation: [
      `${ticker} appears ${dir === "bullish" ? "undervalued" : "overvalued"} relative to sector peers`,
      `${ticker} DCF model suggests ${dir === "bullish" ? "upside" : "downside"} to current price`,
    ],
  };
  return claims[type][Math.floor(Math.random() * claims[type].length)];
}

const NEGATIVE_COMMENTS = [
  "Data seems outdated, earnings were last week",
  "Too much jargon for a basic analysis",
  "The directional call was wrong — stock went the other way",
  "Analysis didn't account for the recent product launch",
  "Vague conclusion — just says 'could go either way'",
  "Small-cap coverage is really weak",
  "Options analysis ignored the upcoming dividend",
  "Missed the obvious support level on the chart",
];
