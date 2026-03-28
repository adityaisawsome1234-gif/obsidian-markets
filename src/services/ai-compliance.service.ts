/**
 * AI Compliance & Disclaimer Engine
 *
 * Processes EVERY AI output before it reaches the user to ensure
 * regulatory compliance with SEC/FINRA guidelines.
 *
 * Components:
 *   1. ComplianceFilter — detect and strip investment advice language
 *   2. DisclaimerInjector — append context-appropriate disclaimers
 *   3. RiskLabeler — classify output as factual/analysis/speculative
 *   4. AuditLogger — log every AI interaction for 7-year retention
 *
 * Every AI response must pass through processOutput() before reaching
 * the frontend. No exceptions.
 */

import { createHash } from "crypto";

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

export type RiskLabel = "factual" | "analysis" | "speculative";

export type DisclaimerContext =
  | "daily_edge"
  | "deep_dive"
  | "chat"
  | "chat_first"
  | "portfolio"
  | "options"
  | "embed";

export const DISCLAIMER_FULL = `Obsidian AI provides financial data analysis for informational purposes only. This is not investment advice, a recommendation, or a solicitation to buy or sell any security. AI-generated analysis may contain errors. Past performance and AI predictions do not guarantee future results. Always consult a qualified financial advisor before making investment decisions.`;

export const DISCLAIMER_SHORT = `AI analysis for informational purposes only. Not investment advice. May contain errors.`;

export const DISCLAIMER_CHAT_FIRST = `Before we begin: I'm Obsidian AI, a research engine — not a financial advisor. Everything I share is data analysis for informational purposes. I don't make investment recommendations. Any forward-looking statements are based on historical patterns and models, not guarantees. Always consult a qualified financial advisor for investment decisions.\n\n---\n\n`;

/** Compliance preamble injected into ALL Claude system prompts */
export const COMPLIANCE_PREAMBLE = `
COMPLIANCE RULES — NON-NEGOTIABLE:
1. Never tell the user to buy, sell, hold, or trade any security.
2. Never present predictions as certainties. Always use probabilistic language.
3. Always use hedging language for forward-looking statements:
   "data suggests", "historically this pattern preceded",
   "the options market is pricing in", "based on current trajectory".
4. Never guarantee outcomes or returns.
5. When presenting AI accuracy stats, always include the confidence
   interval and sample size.
6. If asked directly "should I buy X?", respond: "I can share the
   data and analysis, but investment decisions should be made with
   a qualified financial advisor. Here's what the data shows..."
7. Frame everything as analysis and data, never as recommendations.
8. Never use phrases like "guaranteed", "can't lose", "sure thing",
   "free money", "don't miss this", or "once in a lifetime".
`;

/* ═══════════════════════════════════════════════════════
   1. ADVICE DETECTION — Banned Pattern Scanner
   ═══════════════════════════════════════════════════════ */

interface FilterMatch {
  pattern: string;
  matched: string;
  position: number;
  replacement: string;
}

const BANNED_PATTERNS: { regex: RegExp; label: string }[] = [
  // Direct recommendations
  { regex: /\byou should (buy|sell|hold|trade|invest in|get rid of|dump|load up on)\b/gi, label: "direct_recommendation" },
  { regex: /\bI recommend (buying|selling|holding|trading|investing|you)\b/gi, label: "direct_recommendation" },
  { regex: /\bI('d| would) (recommend|suggest|advise) (you |that you )?(buy|sell|hold|trade|invest)\b/gi, label: "direct_recommendation" },
  { regex: /\bconsider (buying|selling|adding|dumping|loading up on)\b/gi, label: "soft_recommendation" },
  { regex: /\byou('d| would) be (smart|wise|foolish|crazy) (to|not to) (buy|sell|invest)\b/gi, label: "direct_recommendation" },

  // Promotional language
  { regex: /\bthis is a (good|great|strong|excellent|solid|compelling|clear) (buy|sell|investment|trade|opportunity)\b/gi, label: "promotional" },
  { regex: /\bstrong buy\b/gi, label: "promotional" },
  { regex: /\bmust(-| )buy\b/gi, label: "promotional" },
  { regex: /\bdon'?t miss (this|out)\b/gi, label: "urgency" },
  { regex: /\bact (now|fast|quickly) (before|while)\b/gi, label: "urgency" },
  { regex: /\bbuy (the dip|before it'?s too late|now)\b/gi, label: "urgency" },

  // Guarantee language
  { regex: /\bguaranteed?\b/gi, label: "guarantee" },
  { regex: /\bcan'?t (lose|fail|go wrong)\b/gi, label: "guarantee" },
  { regex: /\bsure thing\b/gi, label: "guarantee" },
  { regex: /\bfree money\b/gi, label: "guarantee" },
  { regex: /\brisk[- ]?free (return|profit|money|investment)\b/gi, label: "guarantee" },
  { regex: /\b100% (chance|probability|certain)\b/gi, label: "guarantee" },
  { regex: /\bno[- ]?brainer (buy|trade|investment)\b/gi, label: "guarantee" },
  { regex: /\bonce in a lifetime\b/gi, label: "urgency" },

  // Specific price targets as recommendations (not as analyst consensus)
  { regex: /\bmy price target (is|would be)\b/gi, label: "personal_target" },
  { regex: /\bI('m| am) targeting \$\d+/gi, label: "personal_target" },
];

const FILTER_REPLACEMENT = "[Analysis removed — Obsidian AI provides data analysis, not investment recommendations. Consult a financial advisor.]";

/**
 * Scan text for banned advice patterns. Returns matches found.
 */
export function scanForAdvice(text: string): FilterMatch[] {
  const matches: FilterMatch[] = [];

  for (const { regex, label } of BANNED_PATTERNS) {
    // Reset regex state
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        pattern: label,
        matched: match[0],
        position: match.index,
        replacement: FILTER_REPLACEMENT,
      });
    }
  }

  return matches;
}

/**
 * Strip banned patterns from text, replacing matched sentences.
 */
export function filterAdvice(text: string): { filtered: string; matches: FilterMatch[] } {
  const matches = scanForAdvice(text);
  if (matches.length === 0) return { filtered: text, matches: [] };

  let filtered = text;
  // Sort by position descending so replacements don't shift indices
  const sorted = [...matches].sort((a, b) => b.position - a.position);

  for (const m of sorted) {
    // Find the sentence containing the match
    const before = filtered.lastIndexOf(".", m.position);
    const after = filtered.indexOf(".", m.position + m.matched.length);
    const sentenceStart = before >= 0 ? before + 1 : 0;
    const sentenceEnd = after >= 0 ? after + 1 : filtered.length;

    const sentence = filtered.slice(sentenceStart, sentenceEnd).trim();
    if (sentence.length > 0) {
      filtered =
        filtered.slice(0, sentenceStart) +
        " " + FILTER_REPLACEMENT + " " +
        filtered.slice(sentenceEnd);
    }
  }

  return { filtered: filtered.trim(), matches };
}

/* ═══════════════════════════════════════════════════════
   2. DISCLAIMER INJECTION
   ═══════════════════════════════════════════════════════ */

/**
 * Get the appropriate disclaimer for a given context.
 */
export function getDisclaimer(context: DisclaimerContext): string {
  switch (context) {
    case "chat_first":
      return DISCLAIMER_CHAT_FIRST;
    case "deep_dive":
      return `\n\n---\n\n*${DISCLAIMER_FULL}*`;
    case "daily_edge":
    case "embed":
      return `\n\n*${DISCLAIMER_SHORT}*`;
    case "portfolio":
    case "options":
      return `\n\n---\n*${DISCLAIMER_SHORT} Portfolio analysis is based on point-in-time data and simplified models.*`;
    case "chat":
    default:
      return `\n\n---\n*${DISCLAIMER_SHORT}*`;
  }
}

/**
 * Inject disclaimer into AI response based on context.
 */
export function injectDisclaimer(
  text: string,
  context: DisclaimerContext
): string {
  const disclaimer = getDisclaimer(context);

  // For chat_first, prepend
  if (context === "chat_first") {
    return disclaimer + text;
  }

  // For all others, append
  return text + disclaimer;
}

/* ═══════════════════════════════════════════════════════
   3. RISK LABELING
   ═══════════════════════════════════════════════════════ */

/** Factual indicators — pure data retrieval */
const FACTUAL_PATTERNS = [
  /\b(current|last|today'?s) (price|close|open|volume|market cap|p\/e|pe ratio|eps|dividend|yield)\b/i,
  /\bwhat('?s| is) (the |)(price|pe|eps|market cap|dividend|volume) (of|for)\b/i,
  /\bhow (much|many) (shares|does|is)\b/i,
  /\bwhen (is|are|does|did) .+ (earnings|report|ex.div|split)\b/i,
];

/** Speculative indicators — forward-looking */
const SPECULATIVE_PATTERNS = [
  /\b(will|could|might|may|expect|predict|forecast|project|anticipate)\b/i,
  /\b(bull case|bear case|upside|downside|target price|price target)\b/i,
  /\b(if .+ (drops?|rises?|falls?|crashes?))\b/i,
  /\b(next quarter|next year|looking ahead|going forward|2026|2027)\b/i,
  /\b(implied move|implied vol|expected move|probability)\b/i,
  /\b(earnings (beat|miss)|guidance (raise|cut))\b/i,
  /\b(momentum|breakout|breakdown|reversal|trend change)\b/i,
  /\b(cycle turn|regime change|rotation|inflection)\b/i,
];

/**
 * Classify AI output risk level.
 */
export function classifyRisk(query: string, response: string): RiskLabel {
  const combined = (query + " " + response).toLowerCase();

  // Check factual first (lowest risk)
  const factualScore = FACTUAL_PATTERNS.reduce(
    (score, pattern) => score + (pattern.test(combined) ? 1 : 0), 0
  );

  // Check speculative (highest risk)
  const specScore = SPECULATIVE_PATTERNS.reduce(
    (score, pattern) => score + (pattern.test(combined) ? 1 : 0), 0
  );

  if (specScore >= 3) return "speculative";
  if (factualScore >= 2 && specScore === 0) return "factual";
  return "analysis";
}

/* ═══════════════════════════════════════════════════════
   4. AUDIT LOG
   ═══════════════════════════════════════════════════════ */

export interface AuditEntry {
  id: string;
  userId: string;
  endpoint: string;
  inputSummary: string;
  outputHash: string;
  riskLabel: RiskLabel;
  filterTriggered: boolean;
  filterDetails: FilterMatch[] | null;
  model: string;
  tokensUsed: number;
  createdAt: string;
}

/** In-memory audit log (production → PostgreSQL with 7-year retention) */
const auditLog: AuditEntry[] = [];
let auditCounter = 0;

/**
 * Log an AI interaction for compliance auditing.
 */
export function logAuditEntry(input: {
  userId: string;
  endpoint: string;
  query: string;
  response: string;
  riskLabel: RiskLabel;
  filterTriggered: boolean;
  filterDetails: FilterMatch[] | null;
  model: string;
  tokensUsed: number;
}): AuditEntry {
  const entry: AuditEntry = {
    id: `audit_${++auditCounter}`,
    userId: input.userId,
    endpoint: input.endpoint,
    inputSummary: input.query.slice(0, 200),
    outputHash: createHash("sha256").update(input.response).digest("hex").slice(0, 16),
    riskLabel: input.riskLabel,
    filterTriggered: input.filterTriggered,
    filterDetails: input.filterDetails,
    model: input.model,
    tokensUsed: input.tokensUsed,
    createdAt: new Date().toISOString(),
  };
  auditLog.push(entry);

  // Log filter triggers for immediate review
  if (input.filterTriggered && input.filterDetails) {
    console.warn(
      `[COMPLIANCE] Filter triggered for ${input.endpoint} | ` +
      `user=${input.userId} | ` +
      `matches=${input.filterDetails.map((m) => `${m.pattern}:"${m.matched}"`).join(", ")}`
    );
  }

  // Cap in-memory log at 10000 entries (production: no cap with PostgreSQL)
  if (auditLog.length > 10000) {
    auditLog.splice(0, auditLog.length - 10000);
  }

  return entry;
}

/**
 * Get recent audit entries (for admin dashboard).
 */
export function getAuditLog(opts?: {
  userId?: string;
  endpoint?: string;
  filterTriggeredOnly?: boolean;
  limit?: number;
}): AuditEntry[] {
  let results = [...auditLog];
  if (opts?.userId) results = results.filter((e) => e.userId === opts.userId);
  if (opts?.endpoint) results = results.filter((e) => e.endpoint === opts.endpoint);
  if (opts?.filterTriggeredOnly) results = results.filter((e) => e.filterTriggered);
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return results.slice(0, opts?.limit ?? 100);
}

/**
 * Get compliance statistics for admin dashboard.
 */
export function getComplianceStats(): {
  totalInteractions: number;
  filterTriggers: number;
  filterRate: number;
  riskDistribution: Record<RiskLabel, number>;
  topTriggerPatterns: { pattern: string; count: number }[];
} {
  const triggers = auditLog.filter((e) => e.filterTriggered);
  const patternCounts = new Map<string, number>();
  for (const entry of triggers) {
    if (entry.filterDetails) {
      for (const match of entry.filterDetails) {
        patternCounts.set(match.pattern, (patternCounts.get(match.pattern) || 0) + 1);
      }
    }
  }

  const riskDist: Record<RiskLabel, number> = { factual: 0, analysis: 0, speculative: 0 };
  for (const entry of auditLog) {
    riskDist[entry.riskLabel]++;
  }

  return {
    totalInteractions: auditLog.length,
    filterTriggers: triggers.length,
    filterRate: auditLog.length > 0 ? Math.round((triggers.length / auditLog.length) * 1000) / 10 : 0,
    riskDistribution: riskDist,
    topTriggerPatterns: [...patternCounts.entries()]
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

/* ═══════════════════════════════════════════════════════
   5. UNIFIED PROCESSOR — wraps every AI output
   ═══════════════════════════════════════════════════════ */

export interface ProcessedOutput {
  text: string;
  riskLabel: RiskLabel;
  filterTriggered: boolean;
  filterCount: number;
  auditId: string;
}

/**
 * Process an AI output through the full compliance pipeline.
 * This MUST be called for every AI response before it reaches the user.
 *
 * Pipeline: Filter → Label → Disclaimer → Audit
 */
export function processOutput(input: {
  query: string;
  response: string;
  userId: string;
  endpoint: string;
  model: string;
  tokensUsed: number;
  disclaimerContext: DisclaimerContext;
  isFirstMessage?: boolean;
}): ProcessedOutput {
  // 1. Filter advice
  const { filtered, matches } = filterAdvice(input.response);

  // 2. Classify risk
  const riskLabel = classifyRisk(input.query, filtered);

  // 3. Inject disclaimer
  const ctx = input.isFirstMessage ? "chat_first" : input.disclaimerContext;
  const withDisclaimer = injectDisclaimer(filtered, ctx);

  // 4. Audit log
  const auditEntry = logAuditEntry({
    userId: input.userId,
    endpoint: input.endpoint,
    query: input.query,
    response: input.response, // Log ORIGINAL response, not filtered
    riskLabel,
    filterTriggered: matches.length > 0,
    filterDetails: matches.length > 0 ? matches : null,
    model: input.model,
    tokensUsed: input.tokensUsed,
  });

  return {
    text: withDisclaimer,
    riskLabel,
    filterTriggered: matches.length > 0,
    filterCount: matches.length,
    auditId: auditEntry.id,
  };
}

/**
 * Lightweight version for streaming responses.
 * Processes a chunk of text (no disclaimer, just filtering).
 * Call processStreamEnd() when streaming is complete.
 */
export function processStreamChunk(text: string): string {
  // For streaming, we do lightweight scanning per chunk
  // Full filtering happens on the accumulated response
  // Just catch the most dangerous patterns inline
  const { filtered } = filterAdvice(text);
  return filtered;
}

/**
 * Finalize a streamed response — log audit entry and return risk label.
 */
export function processStreamEnd(input: {
  query: string;
  fullResponse: string;
  userId: string;
  endpoint: string;
  model: string;
  tokensUsed: number;
}): { riskLabel: RiskLabel; filterTriggered: boolean; auditId: string } {
  const matches = scanForAdvice(input.fullResponse);
  const riskLabel = classifyRisk(input.query, input.fullResponse);

  const auditEntry = logAuditEntry({
    userId: input.userId,
    endpoint: input.endpoint,
    query: input.query,
    response: input.fullResponse,
    riskLabel,
    filterTriggered: matches.length > 0,
    filterDetails: matches.length > 0 ? matches : null,
    model: input.model,
    tokensUsed: input.tokensUsed,
  });

  return {
    riskLabel,
    filterTriggered: matches.length > 0,
    auditId: auditEntry.id,
  };
}
