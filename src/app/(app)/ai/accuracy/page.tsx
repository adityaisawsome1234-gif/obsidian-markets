"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Shield,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Eye,
} from "lucide-react";

interface AccuracyData {
  overall: {
    total: number;
    resolved: number;
    correct: number;
    incorrect: number;
    partial: number;
    pending: number;
    accuracy: number;
    accuracyWithPartial: number;
    confidenceInterval: { low: number; high: number };
  };
  byCategory: Record<string, { total: number; resolved: number; correct: number; accuracy: number }>;
  byTicker: { ticker: string; total: number; accuracy: number }[];
  trend: { period: string; accuracy: number; count: number }[];
  feedbackSummary: {
    totalFeedback: number;
    averageRating: number;
    byType: Record<string, number>;
    recentNegative: { type: string; comment: string | null; ticker: string | null }[];
  };
}

export default function AiAccuracyPage() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/accuracy")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[12px] text-w4 animate-pulse">Loading accuracy data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[12px] text-w4">No accuracy data available yet.</div>
      </div>
    );
  }

  const { overall, byCategory, byTicker, trend, feedbackSummary } = data;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <Target size={16} className="text-a" />
          <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
            AI Prediction Accuracy
          </h1>
          <Badge variant="ai">Live</Badge>
          <Badge variant="live">Public</Badge>
        </div>
        <p className="text-[11px] text-w4 max-w-lg">
          Every AI prediction is tracked and verified against actual market outcomes.
          Full transparency — our accuracy data is public.
        </p>
      </motion.div>

      {/* Hero Stats */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-3 max-md:grid-cols-2"
      >
        <motion.div variants={staggerItem}>
          <Panel>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-semibold tracking-[0.5px] text-w5 uppercase">
                Prediction Accuracy
              </div>
              <div className={cn(
                "font-mono text-[32px] font-bold tracking-[-1px] mt-1",
                overall.accuracy >= 70 ? "text-g" : overall.accuracy >= 50 ? "text-y" : "text-r"
              )}>
                {overall.accuracy}%
              </div>
              <div className="text-[9px] text-w5 mt-0.5">
                95% CI: {overall.confidenceInterval.low}% – {overall.confidenceInterval.high}%
              </div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Panel>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-semibold tracking-[0.5px] text-w5 uppercase">
                Predictions Made
              </div>
              <div className="font-mono text-[32px] font-bold tracking-[-1px] text-w mt-1">
                {overall.total}
              </div>
              <div className="text-[9px] text-w5 mt-0.5">
                {overall.resolved} resolved · {overall.pending} pending
              </div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Panel>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-semibold tracking-[0.5px] text-w5 uppercase">
                User Rating
              </div>
              <div className="font-mono text-[32px] font-bold tracking-[-1px] text-a mt-1">
                {feedbackSummary.averageRating}/5
              </div>
              <div className="text-[9px] text-w5 mt-0.5">
                {feedbackSummary.totalFeedback} reviews
              </div>
            </div>
          </Panel>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Panel>
            <div className="p-3.5 text-center">
              <div className="text-[10px] font-semibold tracking-[0.5px] text-w5 uppercase">
                Win/Loss/Partial
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="font-mono text-[16px] font-bold text-g">{overall.correct}</span>
                <span className="text-w5">/</span>
                <span className="font-mono text-[16px] font-bold text-r">{overall.incorrect}</span>
                <span className="text-w5">/</span>
                <span className="font-mono text-[16px] font-bold text-y">{overall.partial}</span>
              </div>
              <div className="text-[9px] text-w5 mt-1.5">
                incl. partial: {overall.accuracyWithPartial}%
              </div>
            </div>
          </Panel>
        </motion.div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_1fr] gap-4 max-lg:grid-cols-1">
        {/* Accuracy by Category */}
        <Panel>
          <PanelHeader
            label="Accuracy by Category"
            badge={<Badge variant="ai">Tracked</Badge>}
          />
          <div className="p-3.5 space-y-3">
            {Object.entries(byCategory).map(([type, stats]) => (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon type={type} />
                    <span className="text-[11px] text-w3 capitalize">
                      {type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-[13px] font-bold",
                      stats.accuracy >= 70 ? "text-g" : stats.accuracy >= 50 ? "text-y" : "text-r"
                    )}>
                      {stats.accuracy}%
                    </span>
                    <span className="text-[9px] text-w5 font-mono">
                      ({stats.correct}/{stats.resolved})
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-s2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      stats.accuracy >= 70 ? "bg-g" : stats.accuracy >= 50 ? "bg-y" : "bg-r"
                    )}
                    style={{ width: `${Math.min(100, stats.accuracy)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Accuracy Trend */}
        <Panel>
          <PanelHeader
            label="Accuracy Over Time"
            badge={<Badge variant="live">Monthly</Badge>}
          />
          <div className="p-3.5 space-y-1">
            {trend.length === 0 ? (
              <p className="text-[11px] text-w5 py-4 text-center">
                Accumulating data...
              </p>
            ) : (
              trend.map((point) => (
                <div
                  key={point.period}
                  className="flex items-center justify-between py-1.5 border-b border-[var(--brd)] last:border-0"
                >
                  <span className="text-[11px] text-w4 font-mono">{point.period}</span>
                  <div className="flex items-center gap-2">
                    {/* Mini bar */}
                    <div className="w-24 h-1.5 bg-s2 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          point.accuracy >= 70 ? "bg-g" : point.accuracy >= 50 ? "bg-y" : "bg-r"
                        )}
                        style={{ width: `${Math.min(100, point.accuracy)}%` }}
                      />
                    </div>
                    <span className={cn(
                      "font-mono text-[11px] font-medium w-10 text-right",
                      point.accuracy >= 70 ? "text-g" : point.accuracy >= 50 ? "text-y" : "text-r"
                    )}>
                      {point.accuracy}%
                    </span>
                    <span className="text-[9px] text-w5 w-6 text-right">n={point.count}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        {/* Best Tickers */}
        <Panel>
          <PanelHeader label="Accuracy by Ticker" />
          <div className="p-3.5">
            <div className="space-y-0.5">
              {byTicker.slice(0, 12).map((t, i) => (
                <div
                  key={t.ticker}
                  className="flex items-center justify-between py-1.5 border-b border-[var(--brd)] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-w5 font-mono w-4">
                      {i + 1}
                    </span>
                    <span className="text-[12px] font-semibold text-w tracking-[-0.2px]">
                      {t.ticker}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-[12px] font-bold",
                      t.accuracy >= 70 ? "text-g" : t.accuracy >= 50 ? "text-y" : "text-r"
                    )}>
                      {t.accuracy}%
                    </span>
                    <span className="text-[9px] text-w5 font-mono">
                      ({t.total} calls)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* User Feedback Summary */}
        <Panel>
          <PanelHeader
            label="User Feedback"
            badge={<Badge variant="ai">Flywheel</Badge>}
          />
          <div className="p-3.5 space-y-3">
            {/* Feedback type breakdown */}
            <div className="space-y-1.5">
              {Object.entries(feedbackSummary.byType)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const pct = feedbackSummary.totalFeedback > 0
                    ? Math.round((count / feedbackSummary.totalFeedback) * 100)
                    : 0;
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {type === "helpful" ? (
                          <ThumbsUp size={10} className="text-g" />
                        ) : (
                          <ThumbsDown size={10} className="text-r" />
                        )}
                        <span className="text-[11px] text-w3 capitalize">
                          {type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-s2 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              type === "helpful" ? "bg-g" : "bg-r/60"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-w4 font-mono w-8 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Recent negative feedback */}
            {feedbackSummary.recentNegative.length > 0 && (
              <div className="border-t border-[var(--brd)] pt-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={10} className="text-w5" />
                  <span className="text-[9px] font-semibold text-w5 uppercase tracking-[0.4px]">
                    Recent Feedback
                  </span>
                </div>
                {feedbackSummary.recentNegative.slice(0, 4).map((fb, i) => (
                  <div
                    key={i}
                    className="bg-s2 rounded-[var(--rad-sm)] p-2"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge variant="down">{fb.type.replace("_", " ")}</Badge>
                      {fb.ticker && (
                        <span className="text-[9px] font-mono text-w4">{fb.ticker}</span>
                      )}
                    </div>
                    {fb.comment && (
                      <p className="text-[10px] text-w4 leading-[1.5]">
                        &quot;{fb.comment}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Transparency footer */}
      <Panel>
        <div className="p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--abg)] border border-[var(--abr)] flex items-center justify-center shrink-0">
            <Shield size={16} className="text-a" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[12px] font-medium text-w">Our Commitment to Transparency</h3>
            <p className="text-[11px] text-w4 leading-[1.7] max-w-2xl">
              Every AI-generated prediction on Obsidian Markets is tracked, verified against
              actual market outcomes, and published here. We believe financial AI should be
              held accountable. When we&apos;re wrong, you see it. This data is used to continuously
              improve our models — your feedback directly makes the AI smarter.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-[9px] text-w5">
                <Eye size={10} />
                <span>Updated every 5 minutes</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-w5">
                <Sparkles size={10} />
                <span>Verified by market data</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CategoryIcon({ type }: { type: string }) {
  const size = 12;
  switch (type) {
    case "directional":
      return <TrendingUp size={size} className="text-g" />;
    case "volatility":
      return <BarChart3 size={size} className="text-a" />;
    case "event_impact":
      return <Target size={size} className="text-y" />;
    case "valuation":
      return <TrendingDown size={size} className="text-r" />;
    default:
      return <BarChart3 size={size} className="text-w5" />;
  }
}
