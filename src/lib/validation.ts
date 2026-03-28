/**
 * Shared input validation utilities for API routes.
 * Uses simple regex — no external deps needed for these patterns.
 */

/** Valid stock ticker: 1-10 alphanumeric chars, dots, hyphens, carets, equals (for Yahoo symbols like BTC-USD, ^GSPC, GC=F) */
const TICKER_RE = /^[A-Z0-9.\-^=]{1,12}$/;

/**
 * Validate and normalize a ticker symbol.
 * Returns the uppercased ticker or null if invalid.
 */
export function validateTicker(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned || !TICKER_RE.test(cleaned)) return null;
  return cleaned;
}

/** Validate a search query: 1-100 chars, no control characters */
export function validateSearchQuery(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned || cleaned.length > 100) return null;
  // Strip control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(cleaned)) return null;
  return cleaned;
}

/** Validate AI chat mode */
const VALID_MODES = new Set(["search", "think", "canvas"]);
export function validateChatMode(mode: unknown): "search" | "think" | "canvas" | undefined {
  if (mode == null) return undefined;
  if (typeof mode !== "string") return undefined;
  return VALID_MODES.has(mode) ? (mode as "search" | "think" | "canvas") : undefined;
}

/** Max message count and content length for AI chat */
export const AI_CHAT_LIMITS = {
  maxMessages: 50,
  maxContentLength: 15_000, // ~15k chars per message
  maxTotalLength: 100_000,  // ~100k chars total across all messages
} as const;

/**
 * Validate AI chat messages array.
 * Returns sanitized messages or an error string.
 */
export function validateChatMessages(
  messages: unknown
): { ok: true; messages: { role: "user" | "assistant"; content: string }[] } | { ok: false; error: string } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "Messages must be a non-empty array" };
  }
  if (messages.length > AI_CHAT_LIMITS.maxMessages) {
    return { ok: false, error: `Too many messages (max ${AI_CHAT_LIMITS.maxMessages})` };
  }

  let totalLength = 0;
  const validated: { role: "user" | "assistant"; content: string }[] = [];

  for (const msg of messages) {
    if (typeof msg !== "object" || msg == null) {
      return { ok: false, error: "Each message must be an object" };
    }
    const { role, content } = msg as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "Message role must be 'user' or 'assistant'" };
    }
    if (typeof content !== "string" || content.length === 0) {
      return { ok: false, error: "Message content must be a non-empty string" };
    }
    if (content.length > AI_CHAT_LIMITS.maxContentLength) {
      return { ok: false, error: `Message too long (max ${AI_CHAT_LIMITS.maxContentLength} chars)` };
    }
    totalLength += content.length;
    if (totalLength > AI_CHAT_LIMITS.maxTotalLength) {
      return { ok: false, error: "Total message content exceeds limit" };
    }
    validated.push({ role, content });
  }

  return { ok: true, messages: validated };
}
