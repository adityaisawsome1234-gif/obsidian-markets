"use client";

import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { SharedGrid, SharedGridCell } from "@/components/ui/shared-grid";
import { cn } from "@/lib/cn";

const KEY_INDICATORS = [
  { label: "Fed Funds Rate", value: "5.25-5.50%", change: "0 bps", status: "neutral" },
  { label: "CPI (YoY)", value: "3.1%", change: "-0.1%", status: "positive" },
  { label: "Core PCE (YoY)", value: "2.8%", change: "-0.1%", status: "positive" },
  { label: "Unemployment", value: "3.7%", change: "+0.1%", status: "negative" },
  { label: "GDP (QoQ)", value: "3.3%", change: "+0.1%", status: "positive" },
  { label: "10Y Yield", value: "4.28%", change: "+2 bps", status: "negative" },
  { label: "2Y Yield", value: "4.63%", change: "-3 bps", status: "positive" },
  { label: "Spread (10Y-2Y)", value: "-35 bps", change: "+5 bps", status: "warning" },
];

const YIELD_MATURITIES = [
  { maturity: "1M", yield: 5.53 },
  { maturity: "3M", yield: 5.47 },
  { maturity: "6M", yield: 5.36 },
  { maturity: "1Y", yield: 5.02 },
  { maturity: "2Y", yield: 4.63 },
  { maturity: "3Y", yield: 4.38 },
  { maturity: "5Y", yield: 4.21 },
  { maturity: "7Y", yield: 4.24 },
  { maturity: "10Y", yield: 4.28 },
  { maturity: "20Y", yield: 4.52 },
  { maturity: "30Y", yield: 4.42 },
];

const FED_MEETINGS = [
  { date: "Mar 19-20", probHold: 92, probCut: 8 },
  { date: "May 7", probHold: 68, probCut: 32 },
  { date: "Jun 18", probHold: 42, probCut: 58 },
  { date: "Jul 30", probHold: 35, probCut: 65 },
];

const ECON_CALENDAR = [
  { date: "Mon Mar 17", event: "Empire State Manufacturing", actual: null, estimate: "-1.2", previous: "-2.4", impact: "medium" },
  { date: "Tue Mar 18", event: "Retail Sales (MoM)", actual: null, estimate: "0.8%", previous: "-0.8%", impact: "high" },
  { date: "Tue Mar 18", event: "Industrial Production", actual: null, estimate: "0.1%", previous: "0.1%", impact: "medium" },
  { date: "Wed Mar 19", event: "FOMC Rate Decision", actual: null, estimate: "5.50%", previous: "5.50%", impact: "high" },
  { date: "Wed Mar 19", event: "FOMC Press Conference", actual: null, estimate: "—", previous: "—", impact: "high" },
  { date: "Thu Mar 20", event: "Initial Jobless Claims", actual: null, estimate: "215K", previous: "211K", impact: "medium" },
  { date: "Fri Mar 21", event: "Existing Home Sales", actual: null, estimate: "3.97M", previous: "4.00M", impact: "medium" },
];

function statusColor(status: string) {
  if (status === "positive") return "text-g";
  if (status === "negative") return "text-r";
  if (status === "warning") return "text-y";
  return "text-w4";
}

function impactBadge(impact: string) {
  if (impact === "high") return <Badge variant="down">High</Badge>;
  if (impact === "medium") return <Badge variant="warning">Med</Badge>;
  return <Badge variant="neutral">Low</Badge>;
}

export default function MacroPage() {
  const maxYield = Math.max(...YIELD_MATURITIES.map((m) => m.yield));
  const minYield = Math.min(...YIELD_MATURITIES.map((m) => m.yield));
  const yieldRange = maxYield - minYield || 1;

  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
        Macro & Economic Dashboard
      </h1>

      {/* Key indicators */}
      <SharedGrid columns={4}>
        {KEY_INDICATORS.map((ind) => (
          <SharedGridCell key={ind.label}>
            <div className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
              {ind.label}
            </div>
            <div className="font-mono text-[15px] font-medium text-w mt-0.5">
              {ind.value}
            </div>
            <div className={cn("font-mono text-[10px] mt-0.5", statusColor(ind.status))}>
              {ind.change}
            </div>
          </SharedGridCell>
        ))}
      </SharedGrid>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* Yield Curve */}
        <Panel>
          <PanelHeader
            label="Yield Curve"
            badge={
              <span className="text-[9px] font-mono text-y">INVERTED</span>
            }
          />
          <div className="p-3.5">
            <div className="flex items-end gap-1 h-[140px]">
              {YIELD_MATURITIES.map((m) => {
                const height = ((m.yield - minYield) / yieldRange) * 100 + 10;
                return (
                  <div
                    key={m.maturity}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="font-mono text-[9px] text-w3">{m.yield}%</span>
                    <div
                      className="w-full bg-a/30 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <span className="font-mono text-[8px] text-w5">{m.maturity}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* Fed Watch */}
        <Panel>
          <PanelHeader label="Fed Watch" badge={<Badge variant="warning">FOMC</Badge>} />
          <div className="divide-y divide-[var(--brd)]">
            {FED_MEETINGS.map((meeting) => (
              <div
                key={meeting.date}
                className="px-3.5 py-2.5 flex items-center gap-3"
              >
                <span className="font-mono text-[11px] text-w3 min-w-[70px]">
                  {meeting.date}
                </span>
                <div className="flex-1">
                  <div className="flex h-3 rounded-full overflow-hidden gap-px">
                    <div
                      className="bg-w4/40 rounded-l"
                      style={{ width: `${meeting.probHold}%` }}
                    />
                    <div
                      className="bg-g/60 rounded-r"
                      style={{ width: `${meeting.probCut}%` }}
                    />
                  </div>
                </div>
                <div className="text-right min-w-[90px]">
                  <span className="font-mono text-[10px] text-w4">
                    Hold {meeting.probHold}%
                  </span>
                  <span className="font-mono text-[10px] text-g ml-2">
                    Cut {meeting.probCut}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Economic Calendar */}
      <Panel>
        <PanelHeader label="Economic Calendar" badge={<Badge variant="live">This Week</Badge>} />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--brd)] text-[10px] font-mono text-w5">
                <th className="px-3.5 py-2">Date</th>
                <th className="px-3.5 py-2">Event</th>
                <th className="px-3.5 py-2 text-right">Estimate</th>
                <th className="px-3.5 py-2 text-right">Previous</th>
                <th className="px-3.5 py-2 text-right">Impact</th>
              </tr>
            </thead>
            <tbody>
              {ECON_CALENDAR.map((event, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--brd)] last:border-0 hover:bg-s2/50 transition-colors"
                >
                  <td className="px-3.5 py-2 font-mono text-[11px] text-w4">
                    {event.date}
                  </td>
                  <td className="px-3.5 py-2 text-[12px] text-w2 font-medium">
                    {event.event}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11px] text-w3 text-right">
                    {event.estimate}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[11px] text-w4 text-right">
                    {event.previous}
                  </td>
                  <td className="px-3.5 py-2 text-right">
                    {impactBadge(event.impact)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
