/**
 * Event Tracking — Lightweight analytics layer
 *
 * Fires on key user actions and logs to:
 *   1. In-memory store (production → PostgreSQL + PostHog)
 *   2. Console in development
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("page_view", { page: "dashboard" });
 *   track("ai_query", { type: "chat", model: "sonnet", tokens: 342 });
 */

/* ── Event Types ── */

export type AnalyticsEvent =
  | "session_start"
  | "session_end"
  | "page_view"
  | "ticker_search"
  | "ai_query"
  | "ai_deep_dive"
  | "daily_edge_view"
  | "options_chain_view"
  | "strategy_built"
  | "alert_created"
  | "portfolio_view"
  | "portfolio_scan"
  | "share_research"
  | "upgrade_click"
  | "onboarding_complete"
  | "referral_share"
  | "feedback_submitted"
  | "sim_run"
  | "screener_filter"
  | "chart_interaction"
  | "feature_discovery";

export interface EventProperties {
  // Common
  page?: string;
  ticker?: string;
  source?: string;
  duration_seconds?: number;

  // AI
  type?: string;
  model?: string;
  tokens?: number;
  cached?: boolean;
  risk_label?: string;

  // Options
  legs?: number;
  strategy_type?: string;

  // Alert
  alert_type?: string;

  // Portfolio
  holdings_count?: number;

  // Share
  platform?: string;

  // Conversion
  from?: string;
  to?: string;

  // Generic
  [key: string]: unknown;
}

export interface StoredEvent {
  id: string;
  userId: string;
  event: AnalyticsEvent;
  properties: EventProperties;
  sessionId: string;
  timestamp: string;
}

/* ── State ── */

let currentSessionId: string | null = null;
let currentUserId = "anonymous";
let sessionStartTime: number | null = null;
const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

/* ── In-memory event store (production → PostgreSQL + PostHog) ── */

const eventStore: StoredEvent[] = [];
let eventCounter = 0;

/* ── Session Management ── */

function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function startSession(userId?: string): string {
  currentSessionId = generateSessionId();
  sessionStartTime = Date.now();
  if (userId) currentUserId = userId;

  track("session_start", {});
  return currentSessionId;
}

export function endSession(): void {
  if (sessionStartTime) {
    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    track("session_end", { duration_seconds: duration });
  }
  currentSessionId = null;
  sessionStartTime = null;
}

export function setUserId(userId: string): void {
  currentUserId = userId;
}

/* ── Core Track Function ── */

/**
 * Track a user event.
 *
 * Client-side: call directly from components.
 * Server-side: call from API routes with explicit userId.
 */
export function track(
  event: AnalyticsEvent,
  properties: EventProperties = {},
  userId?: string
): void {
  const uid = userId || currentUserId;
  const sid = currentSessionId || "no_session";

  const stored: StoredEvent = {
    id: `evt_${++eventCounter}`,
    userId: uid,
    event,
    properties,
    sessionId: sid,
    timestamp: new Date().toISOString(),
  };

  // Store locally
  eventStore.push(stored);

  // Cap in-memory at 50000
  if (eventStore.length > 50000) {
    eventStore.splice(0, eventStore.length - 50000);
  }

  // Dev logging
  if (isDev && typeof console !== "undefined") {
    const props = Object.entries(properties)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    console.log(`[Analytics] ${event} | user=${uid.slice(0, 8)} | ${props}`);
  }

  // PostHog integration (production)
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).posthog) {
    try {
      const posthog = (window as unknown as Record<string, unknown>).posthog as {
        capture: (event: string, props: Record<string, unknown>) => void;
      };
      posthog.capture(event, { ...properties, sessionId: sid });
    } catch {
      // PostHog unavailable
    }
  }
}

/* ── Query Functions (for analytics service) ── */

/**
 * Get all events, optionally filtered.
 */
export function getEvents(opts?: {
  userId?: string;
  event?: AnalyticsEvent;
  since?: string;
  limit?: number;
}): StoredEvent[] {
  let results = [...eventStore];
  if (opts?.userId) results = results.filter((e) => e.userId === opts.userId);
  if (opts?.event) results = results.filter((e) => e.event === opts.event);
  if (opts?.since) results = results.filter((e) => e.timestamp >= opts.since!);
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return results.slice(0, opts?.limit ?? 1000);
}

/**
 * Get unique user IDs active in a date range.
 */
export function getActiveUsers(since: string, until?: string): Set<string> {
  const users = new Set<string>();
  for (const e of eventStore) {
    if (e.timestamp >= since && (!until || e.timestamp <= until)) {
      users.add(e.userId);
    }
  }
  return users;
}

/**
 * Get session count per user.
 */
export function getSessionCounts(since: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of eventStore) {
    if (e.event === "session_start" && e.timestamp >= since) {
      counts.set(e.userId, (counts.get(e.userId) || 0) + 1);
    }
  }
  return counts;
}

/**
 * Get event count by type.
 */
export function getEventCounts(since: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of eventStore) {
    if (e.timestamp >= since) {
      counts.set(e.event, (counts.get(e.event) || 0) + 1);
    }
  }
  return counts;
}

/**
 * Get all stored events (for export/backup).
 */
export function getAllEvents(): StoredEvent[] {
  return [...eventStore];
}

/**
 * Get event store size.
 */
export function getEventStoreSize(): number {
  return eventStore.length;
}
