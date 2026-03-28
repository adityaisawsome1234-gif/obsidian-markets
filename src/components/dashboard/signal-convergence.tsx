"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";
import { ArrowUpRight, Activity, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";

interface SignalData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  signals: {
    label: string;
    direction: "bullish" | "bearish";
    icon: React.ReactNode;
  }[];
  convergence: "strong" | "moderate" | "weak";
}

// These are the tickers we check for signals
const SIGNAL_TICKERS = ["NVDA", "PLTR", "TSLA"];

export function SignalConvergence() {
  const [data, setData] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignals() {
      const results: SignalData[] = [];

      for (const ticker of SIGNAL_TICKERS) {
        try {
          const res = await fetch(`/api/stock/${ticker}`);
          if (!res.ok) continue;
          const stock = await res.json();

          // Generate signals based on real price data
          const signals: SignalData["signals"] = [];
          let bullCount = 0;
          let bearCount = 0;

          // Price vs 50-day MA
          if (stock.fiftyDayAvg && stock.price > stock.fiftyDayAvg) {
            signals.push({ label: "Above 50 DMA", direction: "bullish", icon: <TrendingUp size={10} /> });
            bullCount++;
          } else if (stock.fiftyDayAvg && stock.price < stock.fiftyDayAvg) {
            signals.push({ label: "Below 50 DMA", direction: "bearish", icon: <TrendingUp size={10} /> });
            bearCount++;
          }

          // Price vs 200-day MA
          if (stock.twoHundredDayAvg && stock.price > stock.twoHundredDayAvg) {
            signals.push({ label: "Above 200 DMA", direction: "bullish", icon: <TrendingUp size={10} /> });
            bullCount++;
          } else if (stock.twoHundredDayAvg && stock.price < stock.twoHundredDayAvg) {
            signals.push({ label: "Below 200 DMA", direction: "bearish", icon: <TrendingUp size={10} /> });
            bearCount++;
          }

          // Volume signal
          if (stock.volume && stock.avgVolume && stock.volume > stock.avgVolume * 1.5) {
            signals.push({ label: "Unusual volume", direction: "bullish", icon: <BarChart3 size={10} /> });
            bullCount++;
          }

          // Price momentum (daily change)
          if (stock.changePercent > 2) {
            signals.push({ label: `Strong momentum +${stock.changePercent.toFixed(1)}%`, direction: "bullish", icon: <Activity size={10} /> });
            bullCount++;
          } else if (stock.changePercent < -2) {
            signals.push({ label: `Selling pressure ${stock.changePercent.toFixed(1)}%`, direction: "bearish", icon: <Activity size={10} /> });
            bearCount++;
          }

          // 52-week position
          if (stock.fiftyTwoWeekHigh && stock.price > stock.fiftyTwoWeekHigh * 0.95) {
            signals.push({ label: "Near 52-week high", direction: "bullish", icon: <TrendingUp size={10} /> });
            bullCount++;
          } else if (stock.fiftyTwoWeekLow && stock.price < stock.fiftyTwoWeekLow * 1.1) {
            signals.push({ label: "Near 52-week low", direction: "bearish", icon: <TrendingUp size={10} /> });
            bearCount++;
          }

          const convergence = bullCount >= 3 ? "strong" : bullCount >= 2 ? "moderate" : "weak";

          results.push({
            ticker: stock.ticker,
            name: stock.name,
            price: stock.price,
            change: stock.changePercent,
            signals: signals.slice(0, 3),
            convergence,
          });
        } catch {
          // Skip failed tickers
        }
      }

      setData(results);
      setLoading(false);
    }

    fetchSignals();
  }, []);

  return (
    <Panel glow>
      <PanelHeader
        label="Signal Convergence"
        badge={<Badge variant="ai">AI</Badge>}
        actions={
          <span className="text-[9px] font-mono text-w5">
            {loading ? "Loading..." : `${data.length} active`}
          </span>
        }
      />
      <motion.div
        className="p-3.5 space-y-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {data.map((item) => (
          <motion.div key={item.ticker} variants={staggerItem}>
            <Link href={`/research/${item.ticker}`} className="block group">
              <div className="flex items-start justify-between p-2.5 rounded-[var(--rad-sm)] hover:bg-s2/60 transition-colors">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-w tracking-[-0.2px]">
                      {item.ticker}
                    </span>
                    <span className="text-[10px] text-w5 truncate">{item.name}</span>
                    {item.convergence === "strong" && (
                      <Badge variant="ai" className="ml-auto shrink-0">Strong Signal</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.signals.map((signal, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                          signal.direction === "bullish"
                            ? "text-g bg-[var(--gbg)]"
                            : "text-r bg-[var(--rbg)]"
                        )}
                      >
                        {signal.icon}
                        {signal.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className="font-mono text-[12px] text-w">
                    ${item.price.toFixed(2)}
                  </div>
                  <div className={cn("font-mono text-[10px]", item.change >= 0 ? "text-g" : "text-r")}>
                    {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}

        {!loading && data.length === 0 && (
          <div className="text-center py-4 text-[11px] text-w5">
            No signals detected. Check back during market hours.
          </div>
        )}

        <motion.div variants={staggerItem} className="pt-1">
          <Link
            href="/research/NVDA"
            className="flex items-center gap-1 text-[11px] text-a hover:opacity-80 transition-opacity"
          >
            <ArrowUpRight size={12} />
            <span>View full signal analysis</span>
          </Link>
        </motion.div>
      </motion.div>
    </Panel>
  );
}
