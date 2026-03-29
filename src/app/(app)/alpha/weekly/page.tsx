"use client";

import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { useWeeklyReport, useGenerateWeeklyReport } from "@/hooks/use-alpha-engine";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import type { ReportSection, WeeklyAlphaReport } from "@/types/alpha-engine";

export default function WeeklyReportPage() {
  const { data, isLoading } = useWeeklyReport();
  const generate = useGenerateWeeklyReport();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-w tracking-[-0.5px]">Weekly Alpha Report</h1>
          <p className="text-[11px] text-w4 mt-0.5">What worked, what failed, and what to adjust</p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-w bg-s3 hover:bg-s4 rounded-md transition-colors disabled:opacity-50"
        >
          {generate.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Generate Report
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12">
          <Loader2 size={14} className="animate-spin text-w5" />
          <span className="text-[11px] text-w5">Loading report...</span>
        </div>
      ) : data?.latest ? (
        <ReportView report={data.latest} />
      ) : (
        <Panel>
          <div className="flex flex-col items-center py-12 text-center">
            <AlertTriangle size={24} className="text-w5 mb-3" />
            <p className="text-[12px] text-w3 mb-1">No weekly report yet</p>
            <p className="text-[11px] text-w5 max-w-[300px]">
              Click &quot;Generate Report&quot; to create your first weekly alpha summary.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

function ReportView({ report }: { report: WeeklyAlphaReport }) {
  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryMetric label="Week P&L" value={`${report.weekPnl >= 0 ? "+" : ""}$${report.weekPnl.toFixed(0)}`} color={report.weekPnl >= 0 ? "text-g" : "text-r"} />
        <SummaryMetric label="Win Rate" value={`${(report.winRate * 100).toFixed(0)}%`} color={report.winRate >= 0.5 ? "text-g" : "text-r"} />
        <SummaryMetric label="Opened" value={String(report.tradesOpened)} color="text-blue" />
        <SummaryMetric label="Closed" value={String(report.tradesClosed)} color="text-w" />
        <SummaryMetric label="Rec Hit Rate" value={`${(report.recommendationHitRate * 100).toFixed(0)}%`} color="text-y" />
      </div>

      {/* What worked */}
      {report.whatWorked.length > 0 && (
        <Panel>
          <PanelHeader label="What Worked" badge={<TrendingUp size={11} className="text-g" />} />
          <div className="p-3 space-y-2">
            {report.whatWorked.map((section, i) => (
              <SectionRow key={i} section={section} variant="positive" />
            ))}
          </div>
        </Panel>
      )}

      {/* What failed */}
      {report.whatFailed.length > 0 && (
        <Panel>
          <PanelHeader label="What Failed" badge={<TrendingDown size={11} className="text-r" />} />
          <div className="p-3 space-y-2">
            {report.whatFailed.map((section, i) => (
              <SectionRow key={i} section={section} variant="negative" />
            ))}
          </div>
        </Panel>
      )}

      {/* Missed patterns */}
      {report.missedPatterns.length > 0 && (
        <Panel>
          <PanelHeader label="Missed Patterns" badge={<AlertTriangle size={11} className="text-y" />} />
          <div className="p-3 space-y-2">
            {report.missedPatterns.map((section, i) => (
              <SectionRow key={i} section={section} variant="neutral" />
            ))}
          </div>
        </Panel>
      )}

      {/* Suggested adjustments */}
      {report.suggestedAdjustments.length > 0 && (
        <Panel>
          <PanelHeader label="Suggested Adjustments" badge={<CheckCircle size={11} className="text-blue" />} />
          <div className="p-3 space-y-2">
            {report.suggestedAdjustments.map((adjustment, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <span className="text-[10px] text-blue shrink-0 mt-0.5">{i + 1}.</span>
                <p className="text-[11px] text-w3 leading-[1.5]">{adjustment}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Report metadata */}
      <p className="text-[9px] text-w5 text-center">
        Week of {report.weekStartDate} — {report.weekEndDate}
      </p>
    </div>
  );
}

function SummaryMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Panel>
      <div className="px-3 py-2.5">
        <span className="text-[9px] text-w5 uppercase tracking-[0.3px]">{label}</span>
        <div className={`text-[16px] font-bold font-mono mt-0.5 ${color}`}>{value}</div>
      </div>
    </Panel>
  );
}

function SectionRow({ section, variant }: { section: ReportSection; variant: "positive" | "negative" | "neutral" }) {
  const color = variant === "positive" ? "text-g" : variant === "negative" ? "text-r" : "text-y";
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-w">{section.title}</span>
        <span className={`text-[10px] font-mono font-bold ${color}`}>
          {section.metricValue >= 0 && variant === "positive" ? "+" : ""}
          {typeof section.metricValue === "number" && section.metric.includes("rate")
            ? `${(section.metricValue * 100).toFixed(0)}%`
            : section.metricValue.toFixed(1)}
        </span>
      </div>
      <p className="text-[10px] text-w4 mt-0.5 leading-[1.4]">{section.description}</p>
    </div>
  );
}
