/**
 * Personal Alpha Engine — Weekly Report Service
 *
 * Generates weekly alpha summaries:
 * - What worked / what failed
 * - Missed patterns
 * - Recommendation hit rate
 * - Behavioral adjustment suggestions
 */

import type {
  Trade,
  WeeklyAlphaReport,
  ReportSection,
  PatternStats,
  RecommendationItem,
} from "@/types/alpha-engine";
import { computeAllPatternStats } from "./pattern-stats.service";
import { SETUP_QUALITY } from "./config";

/* ═══════════════════════════════════════════════════════
   IN-MEMORY STORE
   ═══════════════════════════════════════════════════════ */

const reportStore = new Map<string, WeeklyAlphaReport>();

function genId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ═══════════════════════════════════════════════════════
   REPORT GENERATION
   ═══════════════════════════════════════════════════════ */

export function generateWeeklyReport(
  userId: string,
  allTrades: Trade[],
  allRecommendations: RecommendationItem[],
  weekStart?: Date,
): WeeklyAlphaReport {
  const start = weekStart ?? getLastMonday();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Filter trades for this week
  const weekTrades = allTrades.filter(t => {
    const opened = new Date(t.openedAt);
    const closed = t.closedAt ? new Date(t.closedAt) : null;
    return (opened >= start && opened <= end) || (closed && closed >= start && closed <= end);
  });

  const opened = weekTrades.filter(t => new Date(t.openedAt) >= start && new Date(t.openedAt) <= end);
  const closed = weekTrades.filter(t => t.status === "closed" && t.closedAt && new Date(t.closedAt) >= start);

  const closedReturns = closed
    .filter(t => t.pnlPercent != null)
    .map(t => ({ trade: t, pnl: t.pnlPercent! }));

  const weekPnl = closed
    .filter(t => t.pnlAbsolute != null)
    .reduce((s, t) => s + t.pnlAbsolute!, 0);

  const weekPnlPercent = closedReturns.length > 0
    ? closedReturns.reduce((s, r) => s + r.pnl, 0) / closedReturns.length
    : 0;

  const winRate = closedReturns.length > 0
    ? closedReturns.filter(r => r.pnl > 0).length / closedReturns.length
    : 0;

  // What worked
  const winners = closedReturns.filter(r => r.pnl > 0).sort((a, b) => b.pnl - a.pnl);
  const whatWorked = buildWinnerSections(winners);

  // What failed
  const losers = closedReturns.filter(r => r.pnl < 0).sort((a, b) => a.pnl - b.pnl);
  const whatFailed = buildLoserSections(losers);

  // Missed patterns
  const allClosed = allTrades.filter(t => t.status === "closed");
  const patternStats = computeAllPatternStats(allClosed);
  const missedPatterns = findMissedPatterns(patternStats, weekTrades);

  // Recommendation hit rate this week
  const weekRecs = allRecommendations.filter(r => {
    const created = new Date(r.createdAt);
    return created >= start && created <= end;
  });
  const resolvedRecs = weekRecs.filter(r => r.outcomeStatus === "win" || r.outcomeStatus === "loss");
  const recHitRate = resolvedRecs.length > 0
    ? resolvedRecs.filter(r => r.outcomeStatus === "win").length / resolvedRecs.length
    : 0;

  // Suggested adjustments
  const suggestedAdjustments = generateAdjustments(patternStats, closedReturns, weekTrades);

  const report: WeeklyAlphaReport = {
    id: genId(),
    userId,
    weekStartDate: start.toISOString().split("T")[0],
    weekEndDate: end.toISOString().split("T")[0],
    tradesOpened: opened.length,
    tradesClosed: closed.length,
    weekPnl: round2(weekPnl),
    weekPnlPercent: round2(weekPnlPercent),
    winRate: round2(winRate),
    whatWorked,
    whatFailed,
    missedPatterns,
    recommendationHitRate: round2(recHitRate),
    suggestedAdjustments,
    createdAt: new Date().toISOString(),
  };

  reportStore.set(report.id, report);
  return report;
}

/* ═══════════════════════════════════════════════════════
   REPORT QUERIES
   ═══════════════════════════════════════════════════════ */

export function getLatestWeeklyReport(userId: string): WeeklyAlphaReport | null {
  const reports = Array.from(reportStore.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime());

  return reports[0] ?? null;
}

export function getWeeklyReports(userId: string, limit: number = 10): WeeklyAlphaReport[] {
  return Array.from(reportStore.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
    .slice(0, limit);
}

/* ═══════════════════════════════════════════════════════
   SECTION BUILDERS
   ═══════════════════════════════════════════════════════ */

function buildWinnerSections(winners: { trade: Trade; pnl: number }[]): ReportSection[] {
  if (winners.length === 0) return [];

  const sections: ReportSection[] = [];

  // Top winning trades
  const topWinners = winners.slice(0, 3);
  if (topWinners.length > 0) {
    sections.push({
      title: "Top Winners",
      description: topWinners.map(w =>
        `${w.trade.symbol} (${w.trade.strategyTag}): +${w.pnl.toFixed(1)}%`
      ).join(", "),
      trades: topWinners.map(w => w.trade.id),
      metric: "avg_return",
      metricValue: topWinners.reduce((s, w) => s + w.pnl, 0) / topWinners.length,
    });
  }

  // Winning strategy pattern
  const byStrategy = new Map<string, { trade: Trade; pnl: number }[]>();
  for (const w of winners) {
    const list = byStrategy.get(w.trade.strategyTag) ?? [];
    list.push(w);
    byStrategy.set(w.trade.strategyTag, list);
  }

  for (const [strategy, trades] of byStrategy) {
    if (trades.length >= 2) {
      const avgPnl = trades.reduce((s, t) => s + t.pnl, 0) / trades.length;
      sections.push({
        title: `${formatLabel(strategy)} Working Well`,
        description: `${trades.length} winning ${formatLabel(strategy)} trades this week with avg +${avgPnl.toFixed(1)}% return`,
        trades: trades.map(t => t.trade.id),
        metric: "win_count",
        metricValue: trades.length,
      });
    }
  }

  return sections;
}

function buildLoserSections(losers: { trade: Trade; pnl: number }[]): ReportSection[] {
  if (losers.length === 0) return [];

  const sections: ReportSection[] = [];

  // Worst trades
  const worstTrades = losers.slice(0, 3);
  if (worstTrades.length > 0) {
    sections.push({
      title: "Biggest Losses",
      description: worstTrades.map(l =>
        `${l.trade.symbol} (${l.trade.strategyTag}): ${l.pnl.toFixed(1)}%`
      ).join(", "),
      trades: worstTrades.map(l => l.trade.id),
      metric: "avg_loss",
      metricValue: worstTrades.reduce((s, l) => s + l.pnl, 0) / worstTrades.length,
    });
  }

  // Losing strategy pattern
  const byStrategy = new Map<string, { trade: Trade; pnl: number }[]>();
  for (const l of losers) {
    const list = byStrategy.get(l.trade.strategyTag) ?? [];
    list.push(l);
    byStrategy.set(l.trade.strategyTag, list);
  }

  for (const [strategy, trades] of byStrategy) {
    if (trades.length >= 2) {
      const avgPnl = trades.reduce((s, t) => s + t.pnl, 0) / trades.length;
      sections.push({
        title: `${formatLabel(strategy)} Underperforming`,
        description: `${trades.length} losing ${formatLabel(strategy)} trades this week with avg ${avgPnl.toFixed(1)}% return`,
        trades: trades.map(t => t.trade.id),
        metric: "loss_count",
        metricValue: trades.length,
      });
    }
  }

  return sections;
}

function findMissedPatterns(
  allPatterns: PatternStats[],
  weekTrades: Trade[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Find strong patterns user didn't trade this week
  const strongPatterns = allPatterns.filter(
    p => p.groupType === "strategy_tag" && p.winRate >= SETUP_QUALITY.strong && p.sampleSize >= 5
  );

  const weekStrategies = new Set<string>(weekTrades.map(t => t.strategyTag));

  for (const pattern of strongPatterns) {
    if (!weekStrategies.has(pattern.groupValue)) {
      sections.push({
        title: `Missed: ${formatLabel(pattern.groupValue)}`,
        description: `Your strongest setup (${(pattern.winRate * 100).toFixed(0)}% win rate) wasn't used this week. Look for opportunities.`,
        trades: [],
        metric: "historical_win_rate",
        metricValue: pattern.winRate,
      });
    }
  }

  return sections.slice(0, 3);
}

function generateAdjustments(
  patterns: PatternStats[],
  closedReturns: { trade: Trade; pnl: number }[],
  weekTrades: Trade[],
): string[] {
  const adjustments: string[] = [];

  // Check for overtrading in weak setups
  const weakSetups = patterns.filter(
    p => p.groupType === "strategy_tag" && p.winRate < SETUP_QUALITY.weak && p.sampleSize >= 3
  );
  for (const setup of weakSetups) {
    const weekCount = weekTrades.filter(t => t.strategyTag === setup.groupValue).length;
    if (weekCount >= 2) {
      adjustments.push(
        `Consider reducing ${formatLabel(setup.groupValue)} trades — your historical win rate is only ${(setup.winRate * 100).toFixed(0)}% and you took ${weekCount} this week.`
      );
    }
  }

  // Check for holding too long or too short
  const losers = closedReturns.filter(r => r.pnl < 0);
  const avgLoserHold = losers.length > 0
    ? losers.reduce((s, l) => s + (l.trade.holdingPeriodDays ?? 0), 0) / losers.length
    : 0;
  const winners = closedReturns.filter(r => r.pnl > 0);
  const avgWinnerHold = winners.length > 0
    ? winners.reduce((s, w) => s + (w.trade.holdingPeriodDays ?? 0), 0) / winners.length
    : 0;

  if (losers.length >= 2 && avgLoserHold > avgWinnerHold * 2) {
    adjustments.push(
      `Your losing trades averaged ${avgLoserHold.toFixed(0)} days vs ${avgWinnerHold.toFixed(0)} for winners. Tighter stop-losses or quicker exits on losers could improve results.`
    );
  }

  // Check win rate this week vs overall
  const weekWinRate = closedReturns.length > 0
    ? closedReturns.filter(r => r.pnl > 0).length / closedReturns.length
    : 0;
  const overallStrategy = patterns.find(p => p.groupType === "strategy_tag" && p.sampleSize >= 10);
  if (overallStrategy && weekWinRate < overallStrategy.winRate - 0.2 && closedReturns.length >= 3) {
    adjustments.push(
      `This week's ${(weekWinRate * 100).toFixed(0)}% win rate is below your historical ${(overallStrategy.winRate * 100).toFixed(0)}%. Review if market conditions shifted or if trade selection can improve.`
    );
  }

  if (adjustments.length === 0 && closedReturns.length > 0) {
    adjustments.push("Keep following your strongest patterns and maintaining discipline.");
  }

  return adjustments.slice(0, 5);
}

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function getLastMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Reset store — for testing only */
export function _resetReportStore(): void {
  reportStore.clear();
}
