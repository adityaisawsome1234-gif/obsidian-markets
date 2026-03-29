"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Tabs } from "@/components/ui/tabs";
import { ScoreBar, ScoreRing } from "@/components/alpha/score-bar";
import { InsightCard } from "@/components/alpha/insight-card";
import { RecommendationCard } from "@/components/alpha/recommendation-card";
import { useEdgeSummary, useRecommendations, useGenerateRecommendations, useRecommendationAction } from "@/hooks/use-alpha-engine";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Loader2, Zap, TrendingUp, Target, AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import type { PatternStats } from "@/types/alpha-engine";

export default function AlphaPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: edge, isLoading: edgeLoading } = useEdgeSummary();
  const { data: recs, isLoading: recsLoading } = useRecommendations();
  const generateRecs = useGenerateRecommendations();
  const recAction = useRecommendationAction();

  const tabs = [
    { id: "overview", label: "Your Edge" },
    { id: "recommendations", label: "Trade Ideas" },
    { id: "insights", label: "Insights" },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-w tracking-[-0.5px]">Personal Alpha Engine</h1>
          <p className="text-[11px] text-w4 mt-0.5">Personalized trade intelligence based on your history</p>
        </div>
        {edge && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-w5 uppercase tracking-[0.3px]">Personalization</span>
            <span className={
              edge.personalizationConfidence === "high" ? "text-[10px] font-medium text-g" :
              edge.personalizationConfidence === "medium" ? "text-[10px] font-medium text-y" :
              edge.personalizationConfidence === "low" ? "text-[10px] font-medium text-r" :
              "text-[10px] font-medium text-w5"
            }>
              {edge.personalizationConfidence === "cold_start" ? "Cold Start" : edge.personalizationConfidence}
            </span>
          </div>
        )}
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {edgeLoading ? (
              <LoadingState label="Loading your edge data..." />
            ) : edge && edge.totalClosedTrades > 0 ? (
              <>
                {/* Key metrics row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    icon={<Target size={14} />}
                    label="Win Rate"
                    value={`${(edge.overallWinRate * 100).toFixed(0)}%`}
                    color={edge.overallWinRate >= 0.5 ? "text-g" : "text-r"}
                  />
                  <MetricCard
                    icon={<TrendingUp size={14} />}
                    label="Avg Return"
                    value={`${edge.overallAvgReturn >= 0 ? "+" : ""}${edge.overallAvgReturn.toFixed(1)}%`}
                    color={edge.overallAvgReturn >= 0 ? "text-g" : "text-r"}
                  />
                  <MetricCard
                    icon={<BarChart3 size={14} />}
                    label="Total Trades"
                    value={String(edge.totalClosedTrades)}
                    color="text-blue"
                  />
                  <MetricCard
                    icon={<Zap size={14} />}
                    label="Rec Hit Rate"
                    value={edge.recommendationStats.generated > 0
                      ? `${(edge.recommendationStats.hitRate * 100).toFixed(0)}%`
                      : "—"
                    }
                    color="text-y"
                  />
                </div>

                {/* Best & worst setups */}
                <div className="grid md:grid-cols-2 gap-3">
                  <Panel>
                    <PanelHeader label="Best Setups" badge={<span className="text-[9px] text-g">Lean into these</span>} />
                    <div className="p-3 space-y-2">
                      {edge.bestSetups.length > 0 ? edge.bestSetups.map(s => (
                        <SetupRow key={s.groupKey} stat={s} variant="positive" />
                      )) : (
                        <EmptySetups />
                      )}
                    </div>
                  </Panel>
                  <Panel>
                    <PanelHeader label="Worst Setups" badge={<span className="text-[9px] text-r">Avoid or reduce</span>} />
                    <div className="p-3 space-y-2">
                      {edge.worstSetups.length > 0 ? edge.worstSetups.map(s => (
                        <SetupRow key={s.groupKey} stat={s} variant="negative" />
                      )) : (
                        <EmptySetups />
                      )}
                    </div>
                  </Panel>
                </div>

                {/* Sector performance */}
                {edge.sectorPerformance.length > 0 && (
                  <Panel>
                    <PanelHeader label="Sector Performance" />
                    <div className="p-3 space-y-2">
                      {edge.sectorPerformance.map(s => (
                        <ScoreBar
                          key={s.groupKey}
                          score={Math.max(s.avgReturn + 50, 0)}
                          max={100}
                          label={s.groupValue}
                        />
                      ))}
                    </div>
                  </Panel>
                )}
              </>
            ) : (
              <ColdStartState />
            )}
          </motion.div>
        )}

        {activeTab === "recommendations" && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-w4">
                {recs?.items.length ?? 0} recommendations
                {recs?.run && ` — generated ${new Date(recs.run.createdAt).toLocaleString()}`}
              </span>
              <button
                onClick={() => generateRecs.mutate(undefined)}
                disabled={generateRecs.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-w bg-s3 hover:bg-s4 rounded-md transition-colors disabled:opacity-50"
              >
                {generateRecs.isPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                Generate Ideas
              </button>
            </div>

            {recsLoading ? (
              <LoadingState label="Loading recommendations..." />
            ) : recs?.items.length ? (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                {recs.items.map(item => (
                  <motion.div key={item.id} variants={staggerItem}>
                    <RecommendationCard
                      item={item}
                      onAction={(id, action) => recAction.mutate({ id, action })}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <Panel>
                <div className="flex flex-col items-center py-12 text-center">
                  <Zap size={24} className="text-w5 mb-3" />
                  <p className="text-[12px] text-w3 mb-1">No recommendations yet</p>
                  <p className="text-[11px] text-w5 max-w-[300px]">
                    Click &quot;Generate Ideas&quot; to get personalized trade recommendations based on market signals and your trading history.
                  </p>
                </div>
              </Panel>
            )}
          </motion.div>
        )}

        {activeTab === "insights" && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {edgeLoading ? (
              <LoadingState label="Analyzing patterns..." />
            ) : edge?.insights.length ? (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                {edge.insights.map(insight => (
                  <motion.div key={insight.id} variants={staggerItem}>
                    <InsightCard insight={insight} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <Panel>
                <div className="flex flex-col items-center py-12 text-center">
                  <AlertTriangle size={24} className="text-w5 mb-3" />
                  <p className="text-[12px] text-w3 mb-1">Not enough data for insights</p>
                  <p className="text-[11px] text-w5 max-w-[300px]">
                    Log more trades to unlock personalized behavioral insights. We need at least 5 closed trades to start identifying patterns.
                  </p>
                </div>
              </Panel>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function MetricCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Panel>
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-1.5 text-w5 mb-1.5">
          {icon}
          <span className="text-[9px] font-semibold uppercase tracking-[0.5px]">{label}</span>
        </div>
        <div className={`text-[20px] font-bold font-mono tracking-[-0.5px] ${color}`}>
          {value}
        </div>
      </div>
    </Panel>
  );
}

function SetupRow({ stat, variant }: { stat: PatternStats; variant: "positive" | "negative" }) {
  const label = stat.groupValue.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="min-w-0">
        <span className="text-[11px] font-medium text-w">{label}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-w5">{stat.sampleSize} trades</span>
          <span className="text-[9px] text-w5">avg hold {stat.avgHoldDays.toFixed(0)}d</span>
          {stat.recentTrend !== "stable" && (
            <span className={`text-[9px] ${stat.recentTrend === "improving" ? "text-g" : "text-r"}`}>
              {stat.recentTrend}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className={`text-[12px] font-mono font-bold ${variant === "positive" ? "text-g" : "text-r"}`}>
            {stat.avgReturn >= 0 ? "+" : ""}{stat.avgReturn.toFixed(1)}%
          </div>
          <div className="text-[9px] text-w5">{(stat.winRate * 100).toFixed(0)}% win</div>
        </div>
      </div>
    </div>
  );
}

function EmptySetups() {
  return <p className="text-[11px] text-w5 py-2">Not enough data yet — log more trades</p>;
}

function ColdStartState() {
  return (
    <Panel>
      <div className="flex flex-col items-center py-12 text-center">
        <Zap size={28} className="text-w5 mb-3" />
        <p className="text-[13px] font-medium text-w mb-1">Welcome to Your Alpha Engine</p>
        <p className="text-[11px] text-w4 max-w-[400px] leading-[1.5]">
          Start by logging trades in the Journal tab. Once you have 5+ closed trades,
          the engine will analyze your patterns and generate personalized recommendations.
        </p>
      </div>
    </Panel>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12">
      <Loader2 size={14} className="animate-spin text-w5" />
      <span className="text-[11px] text-w5">{label}</span>
    </div>
  );
}
