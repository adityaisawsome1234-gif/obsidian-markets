"use client";

import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { useStockProfile } from "@/hooks/use-stock-profile";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/animations";

export function AnalystConsensus({ ticker = "AAPL" }: { ticker?: string }) {
  const { data, isLoading } = useStockProfile(ticker);

  if (isLoading) {
    return (
      <Panel>
        <PanelHeader label="Analyst Consensus" />
        <div className="p-4 text-center text-[11px] text-w5">Loading...</div>
      </Panel>
    );
  }

  // Try estimates first (new field), fall back to analysts (legacy)
  const estimate = data?.estimates?.[0] || data?.analysts?.[0];
  if (!estimate) {
    return (
      <Panel>
        <PanelHeader label="Analyst Consensus" />
        <div className="p-4 text-center text-[11px] text-w5">No analyst data for {ticker}</div>
      </Panel>
    );
  }

  const numAnalysts = estimate.numberAnalystEstimatedEps || 0;
  const epsAvg = estimate.estimatedEpsAvg;
  const epsHigh = "estimatedEpsHigh" in estimate ? (estimate as { estimatedEpsHigh: number }).estimatedEpsHigh : null;
  const epsLow = "estimatedEpsLow" in estimate ? (estimate as { estimatedEpsLow: number }).estimatedEpsLow : null;
  const revAvg = estimate.estimatedRevenueAvg;
  const revHigh = "estimatedRevenueHigh" in estimate ? (estimate as { estimatedRevenueHigh: number }).estimatedRevenueHigh : null;
  const revLow = "estimatedRevenueLow" in estimate ? (estimate as { estimatedRevenueLow: number }).estimatedRevenueLow : null;

  const fmtRev = (v: number | null) => {
    if (v == null) return "—";
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
  };

  const rows = [
    { label: "Analysts Covering", value: numAnalysts.toString() },
    { label: "EPS Estimate (Avg)", value: epsAvg != null ? `$${epsAvg.toFixed(2)}` : "—" },
    ...(epsHigh != null && epsLow != null
      ? [{ label: "EPS Range", value: `$${epsLow.toFixed(2)} — $${epsHigh.toFixed(2)}` }]
      : []),
    { label: "Revenue Estimate (Avg)", value: fmtRev(revAvg) },
    ...(revHigh != null && revLow != null
      ? [{ label: "Revenue Range", value: `${fmtRev(revLow)} — ${fmtRev(revHigh)}` }]
      : []),
  ];

  return (
    <Panel>
      <PanelHeader label="Analyst Consensus" />
      <motion.div
        className="p-3.5 space-y-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {rows.map((row) => (
          <motion.div
            key={row.label}
            variants={staggerItem}
            className="flex justify-between text-[12px]"
          >
            <span className="text-w4">{row.label}</span>
            <span className="font-mono text-w font-medium">{row.value}</span>
          </motion.div>
        ))}

        {/* Visual EPS bar if we have range */}
        {epsHigh != null && epsLow != null && epsAvg != null && (
          <motion.div variants={staggerItem} className="pt-2">
            <div className="text-[9px] text-w5 uppercase tracking-wider mb-1.5">EPS Estimate Range</div>
            <div className="relative h-2 bg-s3 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-a/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: epsHigh !== epsLow ? `${((epsAvg - epsLow) / (epsHigh - epsLow)) * 100}%` : "50%" }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-a rounded-full border-2 border-s1 shadow-lg"
                initial={{ left: 0 }}
                animate={{ left: epsHigh !== epsLow ? `calc(${((epsAvg - epsLow) / (epsHigh - epsLow)) * 100}% - 5px)` : "calc(50% - 5px)" }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-mono text-w5">${epsLow.toFixed(2)}</span>
              <span className="text-[9px] font-mono text-a font-medium">${epsAvg.toFixed(2)}</span>
              <span className="text-[9px] font-mono text-w5">${epsHigh.toFixed(2)}</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Panel>
  );
}
