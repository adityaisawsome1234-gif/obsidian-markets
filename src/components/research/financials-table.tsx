"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { cn } from "@/lib/cn";
import { useStockProfile } from "@/hooks/use-stock-profile";

function fmtB(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function FinancialsTable({ ticker = "AAPL" }: { ticker?: string }) {
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");
  const { data, isLoading } = useStockProfile(ticker);

  const statements = data?.income || [];

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader label="Income Statement" />
        <div className="p-4 text-center text-[11px] text-w5">Loading financials...</div>
      </Panel>
    );
  }

  if (statements.length === 0) {
    return (
      <Panel>
        <PanelHeader label="Income Statement" />
        <div className="p-4 text-center text-[11px] text-w5">
          Financial data not available for {ticker}
        </div>
      </Panel>
    );
  }

  const years = statements.slice(0, 4);

  const rows: { label: string; key: string; fmt: (n: number | null | undefined) => string; bold: boolean }[] = [
    { label: "Revenue", key: "revenue", fmt: fmtB, bold: false },
    { label: "Cost of Revenue", key: "costOfRevenue", fmt: fmtB, bold: false },
    { label: "Gross Profit", key: "grossProfit", fmt: fmtB, bold: true },
    { label: "Gross Margin", key: "grossProfitRatio", fmt: fmtPct, bold: false },
    { label: "Operating Expenses", key: "operatingExpenses", fmt: fmtB, bold: false },
    { label: "Operating Income", key: "operatingIncome", fmt: fmtB, bold: true },
    { label: "Operating Margin", key: "operatingIncomeRatio", fmt: fmtPct, bold: false },
    { label: "Net Income", key: "netIncome", fmt: fmtB, bold: true },
    { label: "Net Margin", key: "netIncomeRatio", fmt: fmtPct, bold: false },
    { label: "EPS (Diluted)", key: "epsdiluted", fmt: (n) => n != null ? `$${Number(n).toFixed(2)}` : "—", bold: false },
  ];

  return (
    <Panel>
      <PanelHeader
        label="Income Statement"
        actions={
          <div className="flex gap-0.5">
            {(["annual", "quarterly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded cursor-pointer transition-colors capitalize",
                  period === p ? "bg-s3 text-w" : "text-w4 hover:text-w3 hover:bg-s2"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[var(--brd)]">
              <th className="text-left text-w4 font-medium py-2 px-3.5 min-w-[140px]">Metric</th>
              {years.map((y, yi) => (
                <th key={`${y.calendarYear}-${yi}`} className="text-right text-w4 font-medium py-2 px-3.5 font-mono">
                  FY {y.calendarYear}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-[var(--brd)] hover:bg-s2/30 transition-colors">
                <td className={cn("py-2 px-3.5 text-w3", row.bold && "font-semibold text-w")}>
                  {row.label}
                </td>
                {years.map((y, yi) => (
                  <td key={`${row.key}-${yi}`} className={cn(
                    "py-2 px-3.5 text-right font-mono text-w3",
                    row.bold && "font-semibold text-w"
                  )}>
                    {row.fmt((y as unknown as Record<string, number>)[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
