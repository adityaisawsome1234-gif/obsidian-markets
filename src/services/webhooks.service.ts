/**
 * Webhook System — Enterprise Push Notifications
 *
 * Allows enterprise clients to register webhook URLs to receive:
 * - Price alerts
 * - Options flow alerts
 * - Earnings event notifications
 * - AI-generated briefings (push instead of pull)
 *
 * Includes HMAC signature verification for security.
 */

import { createHmac, randomBytes } from "crypto";

/* ── Types ── */

export type WebhookEvent =
  | "price_alert"
  | "flow_alert"
  | "earnings_event"
  | "ai_briefing"
  | "filing_detected"
  | "tone_shift";

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;           // For HMAC signature verification
  isActive: boolean;
  failCount: number;         // Consecutive failures
  lastDeliveredAt: string | null;
  lastFailedAt: string | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  responseStatus: number | null;
  responseTime: number | null; // ms
  success: boolean;
  error: string | null;
  deliveredAt: string;
}

/* ── Storage ── */

const webhookStore = new Map<string, Webhook>();
const deliveryLog: WebhookDelivery[] = [];
let webhookIdCounter = 0;
let deliveryIdCounter = 0;

/* ── Public API ── */

/**
 * Register a new webhook endpoint.
 */
export function registerWebhook(input: {
  userId: string;
  url: string;
  events: WebhookEvent[];
}): Webhook {
  const secret = randomBytes(32).toString("hex");

  const webhook: Webhook = {
    id: `wh_${++webhookIdCounter}`,
    userId: input.userId,
    url: input.url,
    events: input.events,
    secret,
    isActive: true,
    failCount: 0,
    lastDeliveredAt: null,
    lastFailedAt: null,
    createdAt: new Date().toISOString(),
  };

  webhookStore.set(webhook.id, webhook);
  return webhook;
}

/**
 * Get all webhooks for a user.
 */
export function getUserWebhooks(userId: string): Webhook[] {
  return [...webhookStore.values()]
    .filter((w) => w.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Update webhook events or URL.
 */
export function updateWebhook(
  webhookId: string,
  userId: string,
  updates: { url?: string; events?: WebhookEvent[]; isActive?: boolean }
): Webhook | null {
  const webhook = webhookStore.get(webhookId);
  if (!webhook || webhook.userId !== userId) return null;

  if (updates.url) webhook.url = updates.url;
  if (updates.events) webhook.events = updates.events;
  if (updates.isActive !== undefined) webhook.isActive = updates.isActive;
  return webhook;
}

/**
 * Delete a webhook.
 */
export function deleteWebhook(webhookId: string, userId: string): boolean {
  const webhook = webhookStore.get(webhookId);
  if (!webhook || webhook.userId !== userId) return false;
  webhookStore.delete(webhookId);
  return true;
}

/**
 * Generate HMAC-SHA256 signature for a payload.
 * Clients verify this against the X-Obsidian-Signature header.
 */
export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch an event to all matching webhook endpoints.
 * Returns delivery results.
 */
export async function dispatchEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<WebhookDelivery[]> {
  const matching = [...webhookStore.values()].filter(
    (w) => w.isActive && w.events.includes(event)
  );

  const results: WebhookDelivery[] = [];

  for (const webhook of matching) {
    const delivery = await deliverWebhook(webhook, event, payload);
    results.push(delivery);
  }

  return results;
}

/**
 * Deliver a single webhook with retry logic.
 */
async function deliverWebhook(
  webhook: Webhook,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<WebhookDelivery> {
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = signPayload(webhook.secret, body);
  const startTime = Date.now();

  let delivery: WebhookDelivery;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Obsidian-Signature": `sha256=${signature}`,
        "X-Obsidian-Event": event,
        "X-Obsidian-Delivery": `del_${++deliveryIdCounter}`,
        "User-Agent": "ObsidianMarkets-Webhook/1.0",
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    delivery = {
      id: `del_${deliveryIdCounter}`,
      webhookId: webhook.id,
      event,
      payload,
      responseStatus: response.status,
      responseTime,
      success,
      error: success ? null : `HTTP ${response.status}`,
      deliveredAt: new Date().toISOString(),
    };

    if (success) {
      webhook.failCount = 0;
      webhook.lastDeliveredAt = delivery.deliveredAt;
    } else {
      webhook.failCount++;
      webhook.lastFailedAt = delivery.deliveredAt;
    }
  } catch (err) {
    delivery = {
      id: `del_${deliveryIdCounter}`,
      webhookId: webhook.id,
      event,
      payload,
      responseStatus: null,
      responseTime: Date.now() - startTime,
      success: false,
      error: (err as Error).message || "Delivery failed",
      deliveredAt: new Date().toISOString(),
    };

    webhook.failCount++;
    webhook.lastFailedAt = delivery.deliveredAt;
  }

  // Auto-disable after 10 consecutive failures
  if (webhook.failCount >= 10) {
    webhook.isActive = false;
    console.warn(`[Webhook] Disabled ${webhook.id} after ${webhook.failCount} consecutive failures`);
  }

  deliveryLog.push(delivery);
  // Cap delivery log
  if (deliveryLog.length > 5000) deliveryLog.splice(0, deliveryLog.length - 5000);

  return delivery;
}

/**
 * Get recent deliveries for a webhook.
 */
export function getDeliveries(webhookId: string, limit = 20): WebhookDelivery[] {
  return deliveryLog
    .filter((d) => d.webhookId === webhookId)
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))
    .slice(0, limit);
}

/**
 * Rotate the webhook secret.
 */
export function rotateSecret(webhookId: string, userId: string): string | null {
  const webhook = webhookStore.get(webhookId);
  if (!webhook || webhook.userId !== userId) return null;
  webhook.secret = randomBytes(32).toString("hex");
  return webhook.secret;
}
