"use client";

import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { useStockProfile } from "@/hooks/use-stock-profile";

function fmtShares(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B shares`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M shares`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K shares`;
  return `${n} shares`;
}

export function HoldersList({ ticker = "AAPL" }: { ticker?: string }) {
  const { data, isLoading } = useStockProfile(ticker);
  const holders = data?.holders?.slice(0, 8) || [];

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader label="Top Holders" />
        <div className="p-4 text-center text-[11px] text-w5">Loading...</div>
      </Panel>
    );
  }

  if (holders.length === 0) {
    return (
      <Panel>
        <PanelHeader label="Top Holders" />
        <div className="p-4 text-center text-[11px] text-w5">No holder data for {ticker}</div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader label="Top Holders" />
      <div className="divide-y divide-[var(--brd)]">
        {holders.map((h, i) => (
          <div key={i} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-s2/30 transition-colors">
            <div>
              <div className="text-[12px] text-w2 font-medium">{h.holder}</div>
              <div className="text-[10px] text-w5 font-mono">{fmtShares(h.shares)}</div>
            </div>
            <div className="text-[12px] font-mono text-w3">
              {h.weightPercent != null ? `${h.weightPercent.toFixed(2)}%` : "—"}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
