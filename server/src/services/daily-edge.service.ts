import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { fetchAllMarketData } from './market-data.service.js';

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const DAILY_EDGE_SYSTEM_PROMPT = `You are Obsidian AI, a senior macro strategist writing the Daily Edge briefing for institutional traders on the Obsidian Markets platform.

Your output MUST contain exactly 3 sections in this order:

1. **MARKET PULSE** — Tag each observation BULLISH, BEARISH, or MIXED.
   Summarize overnight and pre-market action across equities, rates, FX, and commodities. Include index levels, changes (bps / %), and volume context.

2. **KEY EVENTS & RISKS** — Tag each item WATCH or CRITICAL.
   Cover macro releases, central bank decisions, earnings, geopolitical risks, and option expiration dynamics within the next 48 hours.

3. **FLOW & SIGNALS** — Tag each item ALERT or SIGNAL.
   Highlight unusual options flow, dark pool prints, GEX/DIX shifts, credit spreads, and cross-asset divergences.

Writing rules:
- Write like a Bloomberg terminal note: dense, precise, every sentence must contain data.
- Reference specific numbers: prices, percentage changes, volumes, dates.
- Use ticker symbols (SPX, ES, NQ, DXY, VIX, TNX, etc.) and all times in ET.
- Flag cross-validation warnings when data sources disagree or show stale timestamps.
- If the overall data reliability score is below 0.75, open with a DATA QUALITY WARNING stating which sources are degraded and how that affects confidence.
- Keep the entire briefing under 600 words.
- Never give investment advice — provide analysis only.
- Do not use greetings, sign-offs, or filler phrases.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BriefingSection {
  title: string;
  tag: string;
  content: string;
}

interface DailyEdgeResult {
  status: 'ok' | 'error' | 'degraded';
  generated_at: string;
  model: string;
  reliability_score: number;
  source_status: Record<string, unknown>;
  warnings: string[];
  briefing: {
    full_text: string;
    sections: BriefingSection[];
  };
  tokens_used: {
    input: number;
    output: number;
  };
}

interface CachedBriefing {
  result: DailyEdgeResult;
  cached_at: number;
}

// ---------------------------------------------------------------------------
// In-memory cache (15-min TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: CachedBriefing | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Claude's response text into structured sections by scanning for
 * known headers: MARKET PULSE, KEY EVENTS, FLOW.
 */
function parseBriefingSections(text: string): BriefingSection[] {
  const sections: BriefingSection[] = [];

  const patterns: { regex: RegExp; title: string; tag: string }[] = [
    { regex: /(?:^|\n)#+?\s*(?:\d+[\.\)]\s*)?(?:\*{0,2})MARKET\s+PULSE(?:\*{0,2})/i, title: 'MARKET PULSE', tag: 'PULSE' },
    { regex: /(?:^|\n)#+?\s*(?:\d+[\.\)]\s*)?(?:\*{0,2})KEY\s+EVENTS/i, title: 'KEY EVENTS & RISKS', tag: 'EVENTS' },
    { regex: /(?:^|\n)#+?\s*(?:\d+[\.\)]\s*)?(?:\*{0,2})FLOW/i, title: 'FLOW & SIGNALS', tag: 'FLOW' },
  ];

  // Find start indices for each section
  const matches: { title: string; tag: string; start: number }[] = [];
  for (const p of patterns) {
    const m = text.match(p.regex);
    if (m && m.index !== undefined) {
      matches.push({ title: p.title, tag: p.tag, start: m.index });
    }
  }

  // Sort by position in text
  matches.sort((a, b) => a.start - b.start);

  for (let i = 0; i < matches.length; i++) {
    const contentStart = matches[i].start;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].start : text.length;
    let content = text.slice(contentStart, contentEnd).trim();

    // Strip the header line itself from the content body
    const newlineIdx = content.indexOf('\n');
    if (newlineIdx !== -1) {
      content = content.slice(newlineIdx + 1).trim();
    }

    // Derive a more specific tag from the content (first tag mention)
    const tagMatch = content.match(/\b(BULLISH|BEARISH|MIXED|WATCH|CRITICAL|ALERT|SIGNAL)\b/);
    const tag = tagMatch ? tagMatch[1] : matches[i].tag;

    sections.push({ title: matches[i].title, tag, content });
  }

  // Fallback: if parsing found nothing, return the whole text as one section
  if (sections.length === 0) {
    sections.push({ title: 'DAILY EDGE', tag: 'MIXED', content: text.trim() });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

function formatMarketDataContext(
  marketData: Record<string, unknown>,
  watchlist?: string[],
): string {
  const lines: string[] = ['=== OBSIDIAN MARKETS — DATA CONTEXT ===', ''];

  // Timestamp
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // If watchlist provided, note it
  if (watchlist && watchlist.length > 0) {
    lines.push(`User Watchlist: ${watchlist.join(', ')}`);
    lines.push('');
  }

  // Walk top-level keys and serialize them readably
  for (const [key, value] of Object.entries(marketData)) {
    lines.push(`--- ${key.toUpperCase()} ---`);
    if (typeof value === 'object' && value !== null) {
      lines.push(JSON.stringify(value, null, 2));
    } else {
      lines.push(String(value));
    }
    lines.push('');
  }

  lines.push('=== END DATA CONTEXT ===');
  return lines.join('\n');
}

async function generateDailyEdge(userWatchlist?: string[]): Promise<DailyEdgeResult> {
  const warnings: string[] = [];
  const generatedAt = new Date().toISOString();
  const model = 'claude-sonnet-4-20250514';

  // ------------------------------------------------------------------
  // 1. Fetch market data
  // ------------------------------------------------------------------
  let marketData: Record<string, unknown> = {};
  let reliabilityScore = 1.0;
  let sourceStatus: Record<string, unknown> = {};

  try {
    const data = await fetchAllMarketData();
    marketData = data as Record<string, unknown>;
    reliabilityScore = (typeof (data as any).reliability_score === 'number')
      ? (data as any).reliability_score
      : 1.0;
    sourceStatus = (typeof (data as any).source_status === 'object' && (data as any).source_status)
      ? (data as any).source_status
      : {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Market data fetch failed: ${msg}`);
    reliabilityScore = 0;
    return {
      status: 'error',
      generated_at: generatedAt,
      model,
      reliability_score: reliabilityScore,
      source_status: sourceStatus,
      warnings,
      briefing: {
        full_text: 'Unable to generate Daily Edge — market data sources are unavailable. Please try again shortly.',
        sections: [{ title: 'ERROR', tag: 'CRITICAL', content: 'Market data fetch failed. Briefing cannot be generated.' }],
      },
      tokens_used: { input: 0, output: 0 },
    };
  }

  if (reliabilityScore < 0.75) {
    warnings.push(`Data reliability score is ${reliabilityScore.toFixed(2)} — some sources may be stale or unavailable.`);
  }

  // ------------------------------------------------------------------
  // 2. Build context string for Claude
  // ------------------------------------------------------------------
  const dataContext = formatMarketDataContext(marketData, userWatchlist);

  // ------------------------------------------------------------------
  // 3. Call Claude
  // ------------------------------------------------------------------
  if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.length === 0) {
    warnings.push('ANTHROPIC_API_KEY not configured — returning fallback briefing.');
    return {
      status: 'degraded',
      generated_at: generatedAt,
      model,
      reliability_score: reliabilityScore,
      source_status: sourceStatus,
      warnings,
      briefing: {
        full_text: 'Daily Edge generation unavailable — Anthropic API key not configured.',
        sections: [{ title: 'DAILY EDGE', tag: 'MIXED', content: 'API key not configured. Please set ANTHROPIC_API_KEY to enable briefing generation.' }],
      },
      tokens_used: { input: 0, output: 0 },
    };
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: DAILY_EDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: dataContext }],
    });

    // Extract text from response
    const fullText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    const sections = parseBriefingSections(fullText);

    const result: DailyEdgeResult = {
      status: reliabilityScore < 0.75 ? 'degraded' : 'ok',
      generated_at: generatedAt,
      model,
      reliability_score: reliabilityScore,
      source_status: sourceStatus,
      warnings,
      briefing: {
        full_text: fullText,
        sections,
      },
      tokens_used: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    };

    // Update cache
    cache = { result, cached_at: Date.now() };

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Claude API call failed: ${msg}`);

    return {
      status: 'error',
      generated_at: generatedAt,
      model,
      reliability_score: reliabilityScore,
      source_status: sourceStatus,
      warnings,
      briefing: {
        full_text: 'Unable to generate Daily Edge — the AI service encountered an error. Please try again shortly.',
        sections: [{ title: 'ERROR', tag: 'CRITICAL', content: `AI generation failed: ${msg}` }],
      },
      tokens_used: { input: 0, output: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// Public Service API
// ---------------------------------------------------------------------------

export const DailyEdgeService = {
  /**
   * Generate a fresh Daily Edge briefing. Optionally pass a user watchlist
   * to personalize the context sent to the model.
   */
  async generate(watchlist?: string[]): Promise<DailyEdgeResult> {
    const result = await generateDailyEdge(watchlist);
    return result;
  },

  /**
   * Return the cached briefing if it exists and is still within the 15-min TTL.
   * Returns null if no valid cache entry is available.
   */
  getCached(): DailyEdgeResult | null {
    if (!cache) return null;
    if (Date.now() - cache.cached_at > CACHE_TTL_MS) {
      cache = null;
      return null;
    }
    return cache.result;
  },

  /**
   * Return lightweight status info about the last generation.
   */
  getStatus(): {
    last_generated: string | null;
    reliability_score: number | null;
    source_status: Record<string, unknown> | null;
    cache_age_seconds: number | null;
  } {
    if (!cache) {
      return {
        last_generated: null,
        reliability_score: null,
        source_status: null,
        cache_age_seconds: null,
      };
    }
    return {
      last_generated: cache.result.generated_at,
      reliability_score: cache.result.reliability_score,
      source_status: cache.result.source_status,
      cache_age_seconds: Math.round((Date.now() - cache.cached_at) / 1000),
    };
  },
};

export { parseBriefingSections };
export type { DailyEdgeResult, BriefingSection };
