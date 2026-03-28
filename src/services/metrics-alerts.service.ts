/**
 * Health Alerts — Automated monitoring for critical metrics
 *
 * Checks key health indicators and fires alerts when thresholds are breached.
 * Production: sends to Slack via webhook. Dev: console warnings.
 */

import { getAnalyticsDashboard } from "./analytics.service";

/* ── Types ── */

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertChannel = "slack" | "email" | "console";

export interface MetricAlert {
  id: string;
  severity: AlertSeverity;
  metric: string;
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
}

/* ── Alert Definitions ── */

interface AlertRule {
  metric: string;
  label: string;
  severity: AlertSeverity;
  condition: "below" | "above" | "drop_pct";
  threshold: number;
  getValue: () => number;
}

const alertRules: AlertRule[] = [
  {
    metric: "d7_retention",
    label: "D7 Retention below 40%",
    severity: "critical",
    condition: "below",
    threshold: 40,
    getValue: () => {
      const d = getAnalyticsDashboard();
      return d.retention.d7;
    },
  },
  {
    metric: "daily_ai_cost",
    label: "Daily AI cost exceeds $500",
    severity: "warning",
    condition: "above",
    threshold: 500,
    getValue: () => {
      const d = getAnalyticsDashboard();
      const today = d.aiCosts[d.aiCosts.length - 1];
      return today?.cost ?? 0;
    },
  },
  {
    metric: "war_wow",
    label: "WAR dropped 20% week-over-week",
    severity: "critical",
    condition: "below",
    threshold: -20,
    getValue: () => {
      const d = getAnalyticsDashboard();
      const latest = d.war[d.war.length - 1];
      return latest?.changePercent ?? 0;
    },
  },
  {
    metric: "churn_rate",
    label: "Monthly churn exceeds 8%",
    severity: "warning",
    condition: "above",
    threshold: 8,
    getValue: () => {
      const d = getAnalyticsDashboard();
      return d.revenue.churnRate;
    },
  },
  {
    metric: "cache_hit_rate",
    label: "AI cache hit rate below 30%",
    severity: "warning",
    condition: "below",
    threshold: 30,
    getValue: () => {
      const d = getAnalyticsDashboard();
      const today = d.aiCosts[d.aiCosts.length - 1];
      return (today?.cacheHitRate ?? 0) * 100;
    },
  },
  {
    metric: "d30_retention",
    label: "D30 Retention below 45%",
    severity: "critical",
    condition: "below",
    threshold: 45,
    getValue: () => {
      const d = getAnalyticsDashboard();
      return d.retention.d30;
    },
  },
];

/* ── Alert Store ── */

const alertHistory: MetricAlert[] = [];
let alertCounter = 0;

/* ── Core ── */

/**
 * Run all health checks. Returns any triggered alerts.
 * Call this on a schedule (every 15 minutes).
 */
export function runHealthChecks(): MetricAlert[] {
  const triggered: MetricAlert[] = [];

  for (const rule of alertRules) {
    try {
      const value = rule.getValue();
      let isTriggered = false;

      switch (rule.condition) {
        case "below":
          isTriggered = value < rule.threshold;
          break;
        case "above":
          isTriggered = value > rule.threshold;
          break;
        case "drop_pct":
          isTriggered = value < rule.threshold;
          break;
      }

      if (isTriggered) {
        // Check if same alert was already fired in last hour (dedup)
        const recent = alertHistory.find(
          (a) =>
            a.metric === rule.metric &&
            new Date(a.triggeredAt).getTime() > Date.now() - 60 * 60 * 1000
        );
        if (recent) continue;

        const alert: MetricAlert = {
          id: `alert_${++alertCounter}`,
          severity: rule.severity,
          metric: rule.metric,
          message: `${rule.label} — current: ${value}, threshold: ${rule.threshold}`,
          currentValue: value,
          threshold: rule.threshold,
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
        };

        alertHistory.push(alert);
        triggered.push(alert);
        dispatchAlert(alert);
      }
    } catch (err) {
      console.error(`[HealthCheck] Failed to check ${rule.metric}:`, err);
    }
  }

  return triggered;
}

/**
 * Dispatch an alert to configured channels.
 */
function dispatchAlert(alert: MetricAlert): void {
  const emoji = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";

  // Console (always)
  console.warn(
    `[MetricAlert] ${emoji} ${alert.severity.toUpperCase()}: ${alert.message}`
  );

  // Slack webhook (production)
  const slackUrl = typeof process !== "undefined"
    ? process.env?.SLACK_WEBHOOK_URL
    : undefined;

  if (slackUrl) {
    fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${emoji} *${alert.severity.toUpperCase()}*: ${alert.message}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${emoji} *${alert.severity.toUpperCase()}*\n*${alert.metric}*: ${alert.message}\nCurrent: \`${alert.currentValue}\` | Threshold: \`${alert.threshold}\``,
            },
          },
        ],
      }),
    }).catch(() => {});
  }
}

/**
 * Get alert history (for admin dashboard).
 */
export function getAlertHistory(limit = 50): MetricAlert[] {
  return [...alertHistory]
    .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
    .slice(0, limit);
}

/**
 * Acknowledge an alert.
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = alertHistory.find((a) => a.id === alertId);
  if (!alert) return false;
  alert.acknowledged = true;
  return true;
}

/**
 * Get current health status summary.
 */
export function getHealthStatus(): {
  status: "healthy" | "warning" | "critical";
  activeAlerts: number;
  unacknowledged: number;
} {
  const active = alertHistory.filter(
    (a) => !a.acknowledged && new Date(a.triggeredAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
  );
  const hasCritical = active.some((a) => a.severity === "critical");
  const hasWarning = active.some((a) => a.severity === "warning");

  return {
    status: hasCritical ? "critical" : hasWarning ? "warning" : "healthy",
    activeAlerts: active.length,
    unacknowledged: active.filter((a) => !a.acknowledged).length,
  };
}
