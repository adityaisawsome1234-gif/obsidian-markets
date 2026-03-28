/**
 * API Key Management — Enterprise B2B API Layer
 *
 * Manages API keys for RIAs, hedge funds, and fintech companies.
 * Keys have scoped permissions, configurable rate limits, and usage tracking.
 *
 * In-memory storage (production → PostgreSQL with bcrypt hashing).
 */

import { createHash, randomBytes } from "crypto";

/* ── Types ── */

export type ApiPermission =
  | "read_market"
  | "read_research"
  | "ai_query"
  | "ai_deep_dive"
  | "options_flow"
  | "portfolio_analytics"
  | "filings"
  | "earnings_intel"
  | "webhooks";

export type ApiTier = "developer" | "business" | "enterprise";

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;        // "obs_live_abc12..." (first 16 chars shown in UI)
  permissions: ApiPermission[];
  tier: ApiTier;
  rateLimit: number;        // requests per minute
  dailyLimit: number;       // requests per day
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyUsage {
  keyId: string;
  date: string;             // YYYY-MM-DD
  requests: number;
  aiTokens: number;
  errors: number;
  endpoints: Record<string, number>; // endpoint → count
}

export interface ApiKeyCreateResult {
  key: ApiKey;
  rawKey: string;           // Only returned once at creation time
}

/* ── Tier Configuration ── */

export const TIER_CONFIG: Record<ApiTier, {
  label: string;
  price: string;
  rateLimit: number;
  dailyLimit: number;
  permissions: ApiPermission[];
  aiModel: string;
}> = {
  developer: {
    label: "Developer",
    price: "$99/month",
    rateLimit: 100,
    dailyLimit: 10_000,
    permissions: ["read_market", "read_research", "ai_query", "filings", "earnings_intel"],
    aiModel: "sonnet",
  },
  business: {
    label: "Business",
    price: "$499/month",
    rateLimit: 500,
    dailyLimit: 100_000,
    permissions: ["read_market", "read_research", "ai_query", "ai_deep_dive", "options_flow", "portfolio_analytics", "filings", "earnings_intel"],
    aiModel: "sonnet",
  },
  enterprise: {
    label: "Enterprise",
    price: "Custom",
    rateLimit: 2000,
    dailyLimit: 1_000_000,
    permissions: ["read_market", "read_research", "ai_query", "ai_deep_dive", "options_flow", "portfolio_analytics", "filings", "earnings_intel", "webhooks"],
    aiModel: "opus",
  },
};

/* ── Storage ── */

const keyStore = new Map<string, ApiKey>();          // id → key
const hashIndex = new Map<string, string>();          // hash → id
const usageStore = new Map<string, ApiKeyUsage>();   // "keyId:date" → usage
const rateLimitWindows = new Map<string, { count: number; windowStart: number }>();
let idCounter = 0;

/* ── Key Generation ── */

function generateRawKey(): string {
  const random = randomBytes(32).toString("base64url");
  return `obs_live_${random}`;
}

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/* ── Public API ── */

/**
 * Create a new API key for a user.
 * Returns the raw key ONCE — it's never stored in plaintext.
 */
export function createApiKey(input: {
  userId: string;
  name: string;
  tier: ApiTier;
  expiresAt?: string;
}): ApiKeyCreateResult {
  const rawKey = generateRawKey();
  const hash = hashKey(rawKey);
  const tierConfig = TIER_CONFIG[input.tier];

  const key: ApiKey = {
    id: `apikey_${++idCounter}`,
    userId: input.userId,
    name: input.name,
    keyHash: hash,
    keyPrefix: rawKey.slice(0, 16) + "...",
    permissions: tierConfig.permissions,
    tier: input.tier,
    rateLimit: tierConfig.rateLimit,
    dailyLimit: tierConfig.dailyLimit,
    isActive: true,
    lastUsedAt: null,
    expiresAt: input.expiresAt ?? null,
    createdAt: new Date().toISOString(),
  };

  keyStore.set(key.id, key);
  hashIndex.set(hash, key.id);

  return { key, rawKey };
}

/**
 * Validate an API key from a request header.
 * Returns the key if valid, null if invalid/expired/inactive.
 */
export function validateApiKey(rawKey: string): ApiKey | null {
  if (!rawKey || !rawKey.startsWith("obs_live_")) return null;

  const hash = hashKey(rawKey);
  const keyId = hashIndex.get(hash);
  if (!keyId) return null;

  const key = keyStore.get(keyId);
  if (!key) return null;

  // Check active
  if (!key.isActive) return null;

  // Check expiration
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    key.isActive = false;
    return null;
  }

  // Update last used
  key.lastUsedAt = new Date().toISOString();
  return key;
}

/**
 * Check if a key has a specific permission.
 */
export function hasPermission(key: ApiKey, permission: ApiPermission): boolean {
  return key.permissions.includes(permission);
}

/**
 * Check rate limit for an API key. Returns { allowed, remaining, resetIn }.
 */
export function checkApiKeyRateLimit(keyId: string, rateLimit: number): {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  const windowMs = 60_000; // 1-minute window
  const window = rateLimitWindows.get(keyId);

  if (!window || now - window.windowStart > windowMs) {
    rateLimitWindows.set(keyId, { count: 1, windowStart: now });
    return { allowed: true, remaining: rateLimit - 1, resetInSeconds: 60 };
  }

  if (window.count >= rateLimit) {
    const resetIn = Math.ceil((window.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds: resetIn };
  }

  window.count++;
  return {
    allowed: true,
    remaining: rateLimit - window.count,
    resetInSeconds: Math.ceil((window.windowStart + windowMs - now) / 1000),
  };
}

/**
 * Check daily limit for an API key.
 */
export function checkDailyLimit(keyId: string, dailyLimit: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = `${keyId}:${today}`;
  const usage = usageStore.get(usageKey);
  return !usage || usage.requests < dailyLimit;
}

/**
 * Record a request against an API key.
 */
export function recordUsage(keyId: string, endpoint: string, aiTokens = 0, isError = false): void {
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = `${keyId}:${today}`;

  let usage = usageStore.get(usageKey);
  if (!usage) {
    usage = { keyId, date: today, requests: 0, aiTokens: 0, errors: 0, endpoints: {} };
    usageStore.set(usageKey, usage);
  }

  usage.requests++;
  usage.aiTokens += aiTokens;
  if (isError) usage.errors++;
  usage.endpoints[endpoint] = (usage.endpoints[endpoint] || 0) + 1;
}

/**
 * Get usage stats for a key.
 */
export function getKeyUsage(keyId: string, days = 30): ApiKeyUsage[] {
  const results: ApiKeyUsage[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const date = new Date(now.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    const usage = usageStore.get(`${keyId}:${date}`);
    if (usage) results.push(usage);
  }
  return results;
}

/**
 * Get all keys for a user.
 */
export function getUserKeys(userId: string): ApiKey[] {
  return [...keyStore.values()]
    .filter((k) => k.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Revoke an API key.
 */
export function revokeApiKey(keyId: string, userId: string): boolean {
  const key = keyStore.get(keyId);
  if (!key || key.userId !== userId) return false;
  key.isActive = false;
  return true;
}

/**
 * Middleware helper — validate key from request headers and enforce limits.
 */
export function authenticateApiRequest(
  headerValue: string | null,
  requiredPermission: ApiPermission
): {
  ok: boolean;
  key?: ApiKey;
  error?: string;
  status?: number;
  headers?: Record<string, string>;
} {
  if (!headerValue) {
    return { ok: false, error: "Missing API key. Pass X-Obsidian-Key header.", status: 401 };
  }

  const key = validateApiKey(headerValue);
  if (!key) {
    return { ok: false, error: "Invalid or expired API key.", status: 401 };
  }

  if (!hasPermission(key, requiredPermission)) {
    return { ok: false, error: `Insufficient permissions. This endpoint requires '${requiredPermission}'.`, status: 403 };
  }

  // Rate limit
  const rl = checkApiKeyRateLimit(key.id, key.rateLimit);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Rate limit exceeded. ${rl.remaining} remaining. Resets in ${rl.resetInSeconds}s.`,
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(key.rateLimit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rl.resetInSeconds),
        "Retry-After": String(rl.resetInSeconds),
      },
    };
  }

  // Daily limit
  if (!checkDailyLimit(key.id, key.dailyLimit)) {
    return { ok: false, error: "Daily request limit exceeded. Resets at midnight UTC.", status: 429 };
  }

  return {
    ok: true,
    key,
    headers: {
      "X-RateLimit-Limit": String(key.rateLimit),
      "X-RateLimit-Remaining": String(rl.remaining),
      "X-RateLimit-Reset": String(rl.resetInSeconds),
    },
  };
}
