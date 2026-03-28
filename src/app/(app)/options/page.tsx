"use client";

import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { SharedGrid, SharedGridCell } from "@/components/ui/shared-grid";
import { cn } from "@/lib/cn";
import { useOptionsChain, useOptionsFlow } from "@/hooks/use-options-chain";
import { ChainView } from "@/components/options/chain-view";
import StrategyBuilder from "@/components/options/strategy-builder";
import { GexChart } from "@/components/options/gex-chart";
import { IVSurface } from "@/components/options/iv-surface";
import EarningsPlay from "@/components/options/earnings-play";
import type { OptionsContract, OptionsFlowItem } from "@/types/options";

const TABS = [
  { id: "chain", label: "Options Chain" },
  { id: "flow", label: "Flow" },
  { id: "strategy", label: "Strategy Builder" },
  { id: "iv", label: "IV Surface" },
  { id: "gex", label: "GEX" },
  { id: "earnings", label: "Earnings Play" },
];

function formatPremium(val: number): string {
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

function FlowTable({ flow }: { flow: OptionsFlowItem[] }) {
  return (
    <Panel>
      <PanelHeader label="Options Flow" badge={<Badge variant="live">Live</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--brd)] text-[9px] font-mono text-w5 uppercase tracking-wider">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Ticker</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Strike</th>
              <th className="px-3 py-2">Exp</th>
              <th className="px-3 py-2 text-right">Premium</th>
              <th className="px-3 py-2 text-right">Size</th>
              <th className="px-3 py-2 text-right">IV</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Signal</th>
            </tr>
          </thead>
          <tbody>
            {flow.map((item, idx) => {
              const isCall = item.type === "call";
              const time = new Date(item.time);
              const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  className="border-b border-[var(--brd)] last:border-0 hover:bg-s2/50 transition-colors"
                >
                  <td className="px-3 py-1.5 text-[11px] text-w4 font-mono">{timeStr}</td>
                  <td className="px-3 py-1.5 text-[12px] font-semibold text-w">{item.ticker}</td>
                  <td className="px-3 py-1.5">
                    <span className={cn(
                      "font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px]",
                      isCall ? "bg-[var(--gbg)] text-g" : "bg-[var(--rbg)] text-r"
                    )}>
                      {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-w2">${item.strike}</td>
                  <td className="px-3 py-1.5 text-[10px] text-w4">{item.expiration}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-w2 text-right">{formatPremium(item.premium)}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-w3 text-right">{item.size.toLocaleString()}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-w3 text-right">{(item.impliedVolatility * 100).toFixed(1)}%</td>
                  <td className="px-3 py-1.5 text-[10px] text-w4 uppercase">{item.side}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      <Badge variant={item.sentiment === "bullish" ? "up" : "down"}>
                        {item.sentiment}
                      </Badge>
                      {item.isUnusual && <Badge variant="warning">Unusual</Badge>}
                      {item.isSweep && <Badge variant="ai">Sweep</Badge>}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function OptionsPage() {
  const [activeTab, setActiveTab] = useState("chain");
  const [ticker, setTicker] = useState("AAPL");
  const [tickerInput, setTickerInput] = useState("AAPL");

  const { data: chainData, isLoading: chainLoading } = useOptionsChain(ticker);
  const { data: flowData } = useOptionsFlow();

  const handleTickerSubmit = useCallback(() => {
    const clean = tickerInput.trim().toUpperCase();
    if (clean && /^[A-Z]{1,5}$/.test(clean)) {
      setTicker(clean);
    }
  }, [tickerInput]);

  const underlyingPrice = chainData?.underlyingPrice ?? 0;

  // Compute ATM straddle for earnings play
  const atmStraddle = useMemo(() => {
    if (!chainData) return 0;
    const { calls, puts, underlyingPrice: price } = chainData;
    if (calls.length === 0) return 0;
    const atmCall = calls.reduce((best, c) =>
      Math.abs(c.strike - price) < Math.abs(best.strike - price) ? c : best
    , calls[0]);
    const atmPut = puts.reduce((best, p) =>
      Math.abs(p.strike - price) < Math.abs(best.strike - price) ? p : best
    , puts[0]);
    return (atmCall?.ask ?? 0) + (atmPut?.ask ?? 0);
  }, [chainData]);

  const ivStats = chainData?.ivStats;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Options Intelligence
        </h1>
        <div className="flex items-center gap-3">
          {/* Ticker search */}
          <div className="flex items-center bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-2 py-1 gap-1.5">
            <Search size={12} className="text-w5" />
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleTickerSubmit()}
              onBlur={handleTickerSubmit}
              className="bg-transparent outline-none text-[13px] font-semibold text-w w-16 font-mono tracking-wide"
              placeholder="AAPL"
            />
          </div>
          {underlyingPrice > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] text-w">${underlyingPrice.toFixed(2)}</span>
              {chainData && (
                <Badge variant={chainData.expectedMovePercent > 0 ? "up" : "neutral"}>
                  ±{chainData.expectedMovePercent.toFixed(1)}% exp move
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* IV Stats Bar */}
      {ivStats && (
        <SharedGrid columns={4}>
          {([
            { label: "IV Rank", value: `${ivStats.ivRank.toFixed(1)}`, color: ivStats.ivRank > 60 ? "text-r" : ivStats.ivRank > 30 ? "text-y" : "text-g" },
            { label: "IV Percentile", value: `${ivStats.ivPercentile.toFixed(1)}%`, color: ivStats.ivPercentile > 60 ? "text-r" : ivStats.ivPercentile > 30 ? "text-y" : "text-g" },
            { label: "Current IV", value: `${ivStats.currentIV.toFixed(1)}%`, color: "text-w" },
            { label: "HV (30d)", value: `${ivStats.hv30.toFixed(1)}%`, color: "text-w" },
          ] as const).map((stat) => (
            <SharedGridCell key={stat.label}>
              <div className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
                {stat.label}
              </div>
              <div className={cn("font-mono text-[13px] font-medium mt-0.5", stat.color)}>
                {stat.value}
              </div>
            </SharedGridCell>
          ))}
        </SharedGrid>
      )}

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} layoutId="options-tab" />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "chain" && (
            <ChainView ticker={ticker} />
          )}

          {activeTab === "flow" && flowData && (
            <FlowTable flow={flowData} />
          )}

          {activeTab === "strategy" && underlyingPrice > 0 && (
            <StrategyBuilder ticker={ticker} underlyingPrice={underlyingPrice} />
          )}

          {activeTab === "iv" && chainData && (
            <IVSurface
              ticker={ticker}
              underlyingPrice={underlyingPrice}
              calls={chainData.calls}
              puts={chainData.puts}
              expirations={chainData.expirations}
            />
          )}

          {activeTab === "gex" && chainData && (
            <GexChart
              ticker={ticker}
              underlyingPrice={underlyingPrice}
              calls={chainData.calls.map((c) => ({ strike: c.strike, openInterest: c.openInterest, gamma: c.gamma, type: c.type }))}
              puts={chainData.puts.map((p) => ({ strike: p.strike, openInterest: p.openInterest, gamma: p.gamma, type: p.type }))}
            />
          )}

          {activeTab === "earnings" && underlyingPrice > 0 && (
            <EarningsPlay
              ticker={ticker}
              underlyingPrice={underlyingPrice}
              atmStraddle={atmStraddle}
            />
          )}

          {/* Loading / empty states */}
          {activeTab === "strategy" && underlyingPrice === 0 && chainLoading && (
            <Panel className="flex items-center justify-center min-h-[200px]">
              <span className="text-w5 text-[11px]">Loading underlying price...</span>
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
