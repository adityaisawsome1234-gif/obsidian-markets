/**
 * Simple in-memory rate limiter using sliding window counters.
 * For production at scale, replace with Redis-backed (e.g., @upstash/ratelimit).
 * This is sufficient for single-instance deployments.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowEntry>();

// Periodic cleanup to prevent memory leak (every 60s)
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (entry.resetAt < now) windows.delete(key);
    }
  }, 60_000).unref();
}

export interface RateLimitConfig {
  /** Unique namespace for this limiter (e.g., "ai-chat", "search") */
  namespace: string;
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for an identifier (typically IP address).
 * Returns whether the request is allowed and remaining quota.
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  scheduleCleanup();

  const key = `${config.namespace}:${identifier}`;
  const now = Date.now();
  const entry = windows.get(key);

  // Window expired or doesn't exist — start fresh
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    windows.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Within window — check count
  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from Next.js request.
 * Checks x-forwarded-for, x-real-ip, then falls back to "unknown".
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (client IP in proxy chain)
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "unknown";
}

// Pre-configured rate limiters for each route category
export const RATE_LIMITS = {
  aiChat: { namespace: "ai-chat", maxRequests: 15, windowMs: 60_000 } as RateLimitConfig,
  search: { namespace: "search", maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
  stockData: { namespace: "stock", maxRequests: 120, windowMs: 60_000 } as RateLimitConfig,
  market: { namespace: "market", maxRequests: 30, windowMs: 60_000 } as RateLimitConfig,
} as const;

/**
 * Create a 429 response with standard rate-limit headers.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
