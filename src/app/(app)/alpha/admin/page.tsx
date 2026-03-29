"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { useAdminRuns, useAdminRunDetail } from "@/hooks/use-alpha-engine";
import { FactorBreakdownPanel } from "@/components/alpha/factor-breakdown";
import { ScoreBar } from "@/components/alpha/score-bar";
import { Loader2, ChevronRight, Shield } from "lucide-react";
import type { RecommendationItem } from "@/types/alpha-engine";

export default function AdminPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: runsData, isLoading: runsLoading } = useAdminRuns();
  const { data: runDetail } = useAdminRunDetail(selectedRunId ?? "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-y" />
        <div>
          <h1 className="text-[18px] font-bold text-w tracking-[-0.5px]">Alpha Engine Admin</h1>
          <p className="text-[11px] text-w4 mt-0.5">Internal scoring debug and recommendation audit</p>
        </div>
      </div>

      {runsLoading ? (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 size={14} className="animate-spin text-w5" />
          <span className="text-[11px] text-w5">Loading runs...</span>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Runs list */}
          <div className="md:col-span-1">
            <Panel>
              <PanelHeader label="Recommendation Runs" badge={
                <span className="text-[9px] text-w5">{runsData?.runs?.length ?? 0}</span>
              } />
              <div className="max-h-[500px] overflow-y-auto">
                {runsData?.runs?.length ? runsData.runs.map((entry: RunEntry) => (
                  <button
                    key={entry.run.id}
                    onClick={() => setSelectedRunId(entry.run.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--brd)] hover:bg-s2/50 transition-colors text-left ${
                      selectedRunId === entry.run.id ? "bg-s2" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[10px] text-w font-medium">
                        {new Date(entry.run.createdAt).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-w5">{entry.itemCount} recs</span>
                        <span className="text-[9px] text-w5">avg score {entry.avgFinalScore}</span>
                        <span className="text-[9px] text-g">{entry.outcomeStats.wins}W</span>
                        <span className="text-[9px] text-r">{entry.outcomeStats.losses}L</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-w5" />
                  </button>
                )) : (
                  <div className="px-3.5 py-6 text-center text-[11px] text-w5">
                    No recommendation runs yet
                  </div>
                )}
              </div>
            </Panel>

            {/* Global stats */}
            {runsData?.globalStats && (
              <Panel className="mt-3">
                <PanelHeader label="Global Stats" />
                <div className="p-3 space-y-1.5">
                  <StatRow label="Total Generated" value={String(runsData.globalStats.generated)} />
                  <StatRow label="Accepted" value={String(runsData.globalStats.accepted)} />
                  <StatRow label="Hit Rate" value={`${(runsData.globalStats.hitRate * 100).toFixed(0)}%`} />
                  <StatRow label="Avg Return" value={`${runsData.globalStats.avgReturn.toFixed(1)}%`} />
                  <StatRow label="Wins" value={String(runsData.globalStats.wins)} />
                  <StatRow label="Losses" value={String(runsData.globalStats.losses)} />
                  <StatRow label="Pending" value={String(runsData.globalStats.pending)} />
                </div>
              </Panel>
            )}
          </div>

          {/* Run detail */}
          <div className="md:col-span-2">
            {selectedRunId && runDetail ? (
              <div className="space-y-3">
                {/* Run meta */}
                <Panel>
                  <PanelHeader label="Run Detail" />
                  <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatRow label="Symbols Evaluated" value={String(runDetail.run.symbolsEvaluated)} />
                    <StatRow label="Recs Generated" value={String(runDetail.run.recommendationsGenerated)} />
                    <StatRow label="Duration" value={`${runDetail.run.durationMs}ms`} />
                    <StatRow label="Trigger" value={runDetail.run.triggerType} />
                  </div>
                </Panel>

                {/* Outcome stats */}
                <Panel>
                  <PanelHeader label="Outcome Stats" />
                  <div className="p-3 grid grid-cols-5 gap-2">
                    <StatBox label="Pending" value={runDetail.outcomeStats.pending} color="text-w4" />
                    <StatBox label="Wins" value={runDetail.outcomeStats.wins} color="text-g" />
                    <StatBox label="Losses" value={runDetail.outcomeStats.losses} color="text-r" />
                    <StatBox label="B/E" value={runDetail.outcomeStats.breakeven} color="text-y" />
                    <StatBox label="Avg Ret" value={`${runDetail.outcomeStats.avgReturn}%`} color="text-blue" />
                  </div>
                </Panel>

                {/* Items with factor drill-down */}
                <Panel>
                  <PanelHeader label="Scored Recommendations" />
                  <div className="divide-y divide-[var(--brd)]">
                    {runDetail.items.map((item: RecommendationItem) => (
                      <AdminItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </Panel>
              </div>
            ) : (
              <Panel>
                <div className="flex items-center justify-center py-16 text-[11px] text-w5">
                  Select a run to inspect scoring details
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminItemRow({ item }: { item: RecommendationItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-s2/50 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-w">{item.symbol}</span>
          <span className="text-[9px] text-w5">{item.actionType}</span>
          <span className="text-[9px] text-w5">{item.suggestedStrategy}</span>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBar score={item.finalScore} className="w-[120px]" />
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
            item.outcomeStatus === "win" ? "text-g bg-g/10" :
            item.outcomeStatus === "loss" ? "text-r bg-r/10" :
            "text-w5 bg-s3"
          }`}>
            {item.outcomeStatus}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="px-3.5 py-3 bg-s2/30 border-t border-[var(--brd)]">
          <div className="grid grid-cols-4 gap-2 mb-3 text-center">
            <div>
              <div className="text-[9px] text-w5">Market</div>
              <div className="text-[13px] font-mono font-bold text-blue">{item.marketConvictionScore}</div>
            </div>
            <div>
              <div className="text-[9px] text-w5">Edge</div>
              <div className="text-[13px] font-mono font-bold text-g">{item.personalEdgeScore}</div>
            </div>
            <div>
              <div className="text-[9px] text-w5">Risk</div>
              <div className="text-[13px] font-mono font-bold text-r">-{item.riskPenaltyScore}</div>
            </div>
            <div>
              <div className="text-[9px] text-w5">Final</div>
              <div className="text-[13px] font-mono font-bold text-w">{item.finalScore}</div>
            </div>
          </div>
          <p className="text-[10px] text-w4 mb-3 leading-[1.4]">{item.rationaleSummary}</p>
          <FactorBreakdownPanel factors={item.factors} />
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-w5">{label}</span>
      <span className="text-[10px] font-mono text-w">{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] text-w5">{label}</div>
      <div className={`text-[14px] font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

interface RunEntry {
  run: { id: string; createdAt: string; symbolsEvaluated: number; recommendationsGenerated: number; durationMs: number; triggerType: string };
  itemCount: number;
  avgFinalScore: number;
  outcomeStats: { pending: number; wins: number; losses: number; breakeven: number; expired: number; avgReturn: number };
}
