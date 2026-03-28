"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { formatPrice, formatPct, formatChange } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useMarketData } from "@/hooks/use-market-data";

interface TickerData {
  symbol: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
}

const FALLBACK: TickerData[] = [
  { symbol: "SPX", label: "S&P 500", value: 5892.43, change: 32.18, changePercent: 0.55 },
  { symbol: "NDX", label: "Nasdaq", value: 20541.26, change: 187.43, changePercent: 0.92 },
  { symbol: "DJI", label: "Dow Jones", value: 43127.85, change: -45.21, changePercent: -0.10 },
  { symbol: "RUT", label: "Russell 2000", value: 2087.32, change: 14.56, changePercent: 0.70 },
  { symbol: "VIX", label: "VIX", value: 14.32, change: -0.87, changePercent: -5.73 },
  { symbol: "TNX", label: "10Y Yield", value: 4.284, change: 0.023, changePercent: 0.54 },
  { symbol: "BTC", label: "Bitcoin", value: 97432.18, change: 2341.50, changePercent: 2.46 },
  { symbol: "GC", label: "Gold", value: 2934.50, change: -8.30, changePercent: -0.28 },
];

// Index symbols that map to stock/ETF research pages
const RESEARCHABLE: Record<string, string> = {
  SPX: "SPY",
  NDX: "QQQ",
  BTC: "BTC-USD",
  GC: "GLD",
};

export function TickerStrip({ maxItems = 8 }: { maxItems?: number }) {
  const router = useRouter();
  const { indices } = useMarketData();

  // Map store indices to display format, falling back if empty
  const data: TickerData[] = indices.length > 0
    ? indices.slice(0, maxItems).map((idx) => ({
        symbol: idx.symbol,
        label: idx.name,
        value: idx.value,
        change: idx.change,
        changePercent: idx.changePercent,
      }))
    : FALLBACK.slice(0, maxItems);

  return (
    <motion.div
      className="flex border border-[var(--brd)] rounded-[var(--rad)] overflow-x-auto"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {data.map((item, i) => {
        const isPositive = item.change >= 0;
        return (
          <motion.div
            key={item.symbol}
            variants={staggerItem}
            onClick={() => {
              const target = RESEARCHABLE[item.symbol] || item.symbol;
              router.push(`/research/${target}`);
            }}
            className={cn(
              "min-w-[120px] flex-1 px-4 py-3 transition-colors duration-150 hover:bg-s1 cursor-pointer",
              i < data.length - 1 && "border-r border-[var(--brd)]"
            )}
          >
            <div className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
              {item.label}
            </div>
            <div className="font-mono text-[15px] font-medium text-w tracking-[-0.3px] mt-1">
              {item.symbol === "TNX" || item.symbol === "FVX" || item.symbol === "TYX"
                ? item.value.toFixed(3)
                : formatPrice(item.value)}
            </div>
            <div
              className={cn(
                "font-mono text-[11px] mt-0.5",
                isPositive ? "text-g" : "text-r"
              )}
            >
              {formatChange(item.change)} ({formatPct(item.changePercent)})
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
