"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { ChangeBadge } from "@/components/shared/change-badge";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { formatPrice } from "@/lib/format";
import { staggerContainer, staggerItem, springGentle } from "@/lib/animations";
import Link from "next/link";

interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
}

interface AllocationItem {
  label: string;
  weight: number;
  color: string;
}

// User's portfolio stored in localStorage
function getPortfolio(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("obsidian_portfolio") || "[]");
  } catch {
    return [];
  }
}

export function PortfolioCard() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [dayChange, setDayChange] = useState(0);
  const [dayChangePct, setDayChangePct] = useState(0);
  const [allocation, setAllocation] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolio() {
      const saved = getPortfolio();
      setHoldings(saved);

      if (saved.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch current prices for all holdings
      let total = 0;
      let prevTotal = 0;
      const sectorMap: Record<string, number> = {};

      await Promise.all(
        saved.map(async (h) => {
          try {
            const res = await fetch(`/api/stock/${h.ticker}`);
            if (res.ok) {
              const data = await res.json();
              const currentVal = data.price * h.shares;
              const prevVal = data.previousClose * h.shares;
              total += currentVal;
              prevTotal += prevVal;

              // Simple sector mapping
              const sector = getSector(h.ticker);
              sectorMap[sector] = (sectorMap[sector] || 0) + currentVal;
            }
          } catch {
            // Use avg cost as fallback
            total += h.avgCost * h.shares;
            prevTotal += h.avgCost * h.shares;
          }
        })
      );

      setTotalValue(total);
      setDayChange(total - prevTotal);
      setDayChangePct(prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0);

      // Build allocation
      const alloc = Object.entries(sectorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, val]) => ({
          label,
          weight: total > 0 ? Math.round((val / total) * 100) : 0,
          color: sectorColors[label] || "var(--w5)",
        }));
      setAllocation(alloc);
      setLoading(false);
    }

    loadPortfolio();
  }, []);

  // Empty state
  if (!loading && holdings.length === 0) {
    return (
      <Panel glow>
        <PanelHeader label="Portfolio" />
        <div className="p-3.5 space-y-3 text-center">
          <div className="font-mono text-[28px] font-semibold text-w5 tracking-[-1px]">
            —
          </div>
          <p className="text-[11px] text-w4">
            No holdings yet. Add stocks to your portfolio to track performance.
          </p>
          <Link
            href="/portfolio"
            className="block w-full text-center text-[11px] font-medium text-a hover:text-a2 bg-[var(--abg)] hover:bg-a/15 rounded-[var(--rad-sm)] py-2 transition-colors"
          >
            Set Up Portfolio
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <Panel glow>
      <PanelHeader label="Portfolio" />
      <motion.div
        className="p-3.5 space-y-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <div className="font-mono text-[28px] font-semibold text-w tracking-[-1px]">
            {loading ? "..." : (
              <>$<AnimatedNumber value={totalValue} format={(n) => formatPrice(n)} /></>
            )}
          </div>
          {!loading && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`font-mono text-[13px] ${dayChange >= 0 ? "text-g" : "text-r"}`}>
                {dayChange >= 0 ? "+" : ""}${formatPrice(Math.abs(dayChange))}
              </span>
              <ChangeBadge value={dayChangePct} />
              <span className="text-[10px] text-w5">today</span>
            </div>
          )}
        </motion.div>

        {allocation.length > 0 && (
          <motion.div variants={staggerItem}>
            <div className="flex rounded-full h-2 overflow-hidden gap-px">
              {allocation.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.weight}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.05, ...springGentle }}
                  style={{ backgroundColor: item.color, opacity: 0.7 }}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {allocation.map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color, opacity: 0.7 }} />
                  <span className="text-[9px] text-w5">{item.label} {item.weight}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={staggerItem}>
          <Link
            href="/portfolio"
            className="block w-full text-center text-[11px] font-medium text-a hover:text-a2 bg-[var(--abg)] hover:bg-a/15 rounded-[var(--rad-sm)] py-2 transition-colors"
          >
            View Portfolio
          </Link>
        </motion.div>
      </motion.div>
    </Panel>
  );
}

function getSector(ticker: string): string {
  const map: Record<string, string> = {
    AAPL: "Tech", MSFT: "Tech", GOOGL: "Tech", NVDA: "Tech", META: "Tech", AMD: "Tech", AMZN: "Tech",
    TSLA: "Auto", JPM: "Finance", BAC: "Finance", GS: "Finance", V: "Finance", MA: "Finance",
    JNJ: "Health", UNH: "Health", PFE: "Health", ABBV: "Health",
    XOM: "Energy", CVX: "Energy", COP: "Energy",
    PG: "Consumer", KO: "Consumer", WMT: "Consumer",
  };
  return map[ticker] || "Other";
}

const sectorColors: Record<string, string> = {
  Tech: "var(--a)", Finance: "var(--blue)", Health: "var(--g)",
  Energy: "var(--y)", Consumer: "var(--r)", Auto: "#f97316", Other: "var(--w5)",
};
