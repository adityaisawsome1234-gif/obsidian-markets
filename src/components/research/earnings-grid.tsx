"use client";

import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";
import { useStockProfile } from "@/hooks/use-stock-profile";

export function EarningsGrid({ ticker = "AAPL" }: { ticker?: string }) {
  const { data, isLoading } = useStockProfile(ticker);
  const earnings = data?.earnings?.slice(0, 4) || [];

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader label="Earnings History" />
        <div className="p-4 text-center text-[11px] text-w5">Loading...</div>
      </Panel>
    );
  }

  if (earnings.length === 0) {
    return (
      <Panel>
        <PanelHeader label="Earnings History" />
        <div className="p-4 text-center text-[11px] text-w5">No earnings data for {ticker}</div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader label="Earnings History" />
      <motion.div
        className={cn(
          "grid divide-x divide-[var(--brd)]",
          earnings.length >= 4 ? "grid-cols-4" : `grid-cols-${earnings.length}`
        )}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {earnings.map((e, i) => {
          const surprise = e.epsEstimated && e.eps
            ? ((e.eps - e.epsEstimated) / Math.abs(e.epsEstimated)) * 100
            : null;
          const beat = surprise != null && surprise > 0;

          // Determine quarter label — handle both stable and v3 formats
          let quarter = `Q${4 - i}`;
          const dateStr = e.fiscalDateEnding || e.date;
          if (dateStr) {
            try {
              const d = new Date(dateStr);
              const m = d.getMonth() + 1;
              const q = Math.ceil(m / 3);
              quarter = `Q${q} ${d.getFullYear()}`;
            } catch {
              quarter = dateStr.slice(0, 7);
            }
          }

          // Revenue surprise
          const revSurprise = e.revenueEstimated && e.revenue
            ? ((e.revenue - e.revenueEstimated) / Math.abs(e.revenueEstimated)) * 100
            : null;

          return (
            <motion.div key={dateStr || i} variants={staggerItem} className="px-3 py-3 text-center">
              <div className="text-[10px] font-medium text-w4">{quarter}</div>

              <div className="mt-2 space-y-1">
                <div className="text-[9px] text-w5 uppercase">EPS Est.</div>
                <div className="font-mono text-[12px] text-w3">
                  {e.epsEstimated != null ? `$${e.epsEstimated.toFixed(2)}` : "—"}
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <div className="text-[9px] text-w5 uppercase">EPS Actual</div>
                <div className="font-mono text-[13px] font-semibold text-w">
                  {e.eps != null ? `$${e.eps.toFixed(2)}` : "—"}
                </div>
              </div>

              {surprise != null && (
                <div className={cn(
                  "mt-1.5 text-[10px] font-mono font-medium rounded px-1.5 py-0.5 inline-block",
                  beat ? "text-g bg-[var(--gbg)]" : "text-r bg-[var(--rbg)]"
                )}>
                  {beat ? "+" : ""}{surprise.toFixed(1)}%
                </div>
              )}

              {e.revenue != null && (
                <div className="mt-2 space-y-0.5">
                  <div className="text-[9px] text-w5 uppercase">Revenue</div>
                  <div className="font-mono text-[11px] text-w3">
                    {e.revenue >= 1e9 ? `$${(e.revenue / 1e9).toFixed(1)}B` : `$${(e.revenue / 1e6).toFixed(0)}M`}
                  </div>
                  {revSurprise != null && (
                    <div className={cn(
                      "text-[9px] font-mono",
                      revSurprise >= 0 ? "text-g" : "text-r"
                    )}>
                      {revSurprise >= 0 ? "+" : ""}{revSurprise.toFixed(1)}% vs est.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </Panel>
  );
}
