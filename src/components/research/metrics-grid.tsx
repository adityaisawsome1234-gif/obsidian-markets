"use client";

import { motion } from "framer-motion";
import { SharedGrid, SharedGridCell } from "@/components/ui/shared-grid";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useStockProfile } from "@/hooks/use-stock-profile";

function fmt(n: number | undefined | null, opts?: { prefix?: string; suffix?: string; decimals?: number; compact?: boolean }): string {
  if (n == null || isNaN(n)) return "—";
  const { prefix = "", suffix = "", decimals = 2, compact = false } = opts || {};
  if (compact) {
    if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T${suffix}`;
    if (Math.abs(n) >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B${suffix}`;
    if (Math.abs(n) >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M${suffix}`;
    if (Math.abs(n) >= 1e3) return `${prefix}${(n / 1e3).toFixed(1)}K${suffix}`;
  }
  return `${prefix}${n.toFixed(decimals)}${suffix}`;
}

export function MetricsGrid({ ticker = "AAPL" }: { ticker?: string }) {
  const { data, isLoading } = useStockProfile(ticker);

  const p = data?.profile?.[0];
  const r = data?.ratios?.[0];
  const inc = data?.income?.[0];

  const metrics = [
    { label: "Mkt Cap", value: fmt(p?.marketCap || p?.mktCap, { prefix: "$", compact: true }) },
    { label: "P/E", value: fmt(r?.peRatioTTM) },
    { label: "EV/EBITDA", value: fmt(r?.enterpriseValueOverEBITDATTM) },
    { label: "EPS (TTM)", value: fmt(inc?.epsdiluted, { prefix: "$" }) },
    { label: "Revenue", value: fmt(inc?.revenue, { prefix: "$", compact: true }) },
    { label: "Gross Margin", value: inc?.grossProfitRatio != null ? fmt(inc.grossProfitRatio * 100, { suffix: "%" }) : "—" },
    { label: "Net Margin", value: inc?.netIncomeRatio != null ? fmt(inc.netIncomeRatio * 100, { suffix: "%" }) : "—" },
    { label: "FCF Yield", value: r?.freeCashFlowYieldTTM != null ? fmt(r.freeCashFlowYieldTTM * 100, { suffix: "%" }) : "—" },
    { label: "Div Yield", value: r?.dividendYieldTTM != null ? fmt(r.dividendYieldTTM * 100, { suffix: "%" }) : "—" },
    { label: "Beta", value: fmt(p?.beta) },
    { label: "52W Range", value: p?.range || "—" },
    { label: "Avg Volume", value: fmt(p?.volAvg, { compact: true }) },
  ];

  if (isLoading) {
    return (
      <SharedGrid columns={4}>
        {Array.from({ length: 12 }).map((_, i) => (
          <SharedGridCell key={i}>
            <div className="text-[10px] text-w5 uppercase tracking-[0.4px]">...</div>
            <div className="font-mono text-[14px] font-medium text-w mt-0.5">—</div>
          </SharedGridCell>
        ))}
      </SharedGrid>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SharedGrid columns={4}>
        {metrics.map((m) => (
          <motion.div key={m.label} variants={staggerItem}>
            <SharedGridCell>
              <div className="text-[10px] text-w5 uppercase tracking-[0.4px]">{m.label}</div>
              <div className="font-mono text-[14px] font-medium text-w mt-0.5">{m.value}</div>
            </SharedGridCell>
          </motion.div>
        ))}
      </SharedGrid>
    </motion.div>
  );
}
