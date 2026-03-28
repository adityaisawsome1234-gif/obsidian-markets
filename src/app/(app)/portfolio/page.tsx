"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { SharedGrid, SharedGridCell } from "@/components/ui/shared-grid";
import { ChangeBadge } from "@/components/shared/change-badge";
import { Tabs } from "@/components/ui/tabs";
import { formatPrice, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion } from "framer-motion";
import { CorrelationHeatmap } from "@/components/portfolio/correlation-heatmap";
import { WhatIfScenarios } from "@/components/portfolio/what-if-scenarios";
import { RebalancingSuggestions } from "@/components/portfolio/rebalancing-suggestions";
import { PortfolioAlerts } from "@/components/portfolio/portfolio-alerts";
import { PortfolioSimulator } from "@/components/ai/portfolio-simulator";
import { ConnectPortfolio } from "@/components/portfolio/connect-portfolio";
import type { PortfolioHolding } from "@/types/portfolio";

const PORTFOLIO_SUMMARY = {
  totalValue: 247831.42,
  dayChange: 1842.67,
  dayChangePercent: 0.75,
  totalReturn: 47831.42,
  totalReturnPercent: 23.92,
  ytdReturn: 18432.12,
  ytdReturnPercent: 8.03,
};

const STATS = [
  { label: "Sharpe Ratio", value: "1.84" },
  { label: "Beta", value: "1.12" },
  { label: "Max Drawdown", value: "-8.3%" },
  { label: "Value at Risk (95%)", value: "$4,230" },
  { label: "Dividend Yield", value: "1.24%" },
  { label: "Annual Income", value: "$3,073" },
];

const HOLDINGS = [
  { ticker: "AAPL", name: "Apple Inc.", shares: 150, avgCost: 145.20, current: 189.84, value: 28476, weight: 11.5, dayChange: 1.25 },
  { ticker: "NVDA", name: "NVIDIA Corp", shares: 45, avgCost: 450.00, current: 878.37, value: 39526.65, weight: 15.9, dayChange: 3.84 },
  { ticker: "MSFT", name: "Microsoft", shares: 80, avgCost: 310.50, current: 417.23, value: 33378.40, weight: 13.5, dayChange: -0.31 },
  { ticker: "GOOGL", name: "Alphabet", shares: 120, avgCost: 125.00, current: 164.82, value: 19778.40, weight: 8.0, dayChange: 2.14 },
  { ticker: "AMZN", name: "Amazon.com", shares: 100, avgCost: 140.75, current: 186.49, value: 18649.00, weight: 7.5, dayChange: 1.53 },
  { ticker: "JPM", name: "JPMorgan", shares: 200, avgCost: 155.30, current: 198.42, value: 39684.00, weight: 16.0, dayChange: 0.57 },
  { ticker: "V", name: "Visa Inc.", shares: 75, avgCost: 230.00, current: 283.45, value: 21258.75, weight: 8.6, dayChange: 0.92 },
  { ticker: "UNH", name: "UnitedHealth", shares: 30, avgCost: 490.00, current: 527.84, value: 15835.20, weight: 6.4, dayChange: -0.45 },
];

const SECTORS = [
  { name: "Technology", weight: 48.9, color: "bg-a" },
  { name: "Financial", weight: 24.6, color: "bg-blue" },
  { name: "Healthcare", weight: 6.4, color: "bg-g" },
  { name: "Consumer", weight: 15.5, color: "bg-y" },
  { name: "Cash", weight: 4.6, color: "bg-w5" },
];

const HOLDINGS_DATA: PortfolioHolding[] = HOLDINGS.map((h, i) => ({
  id: String(i + 1),
  ticker: h.ticker,
  name: h.name,
  shares: h.shares,
  avgCost: h.avgCost,
  currentPrice: h.current,
  marketValue: h.value,
  totalReturn: h.value - h.avgCost * h.shares,
  totalReturnPercent: ((h.current - h.avgCost) / h.avgCost) * 100,
  dayChange: h.dayChange * h.value / 100,
  dayChangePercent: h.dayChange,
  weight: h.weight,
  assetType: "STOCK" as const,
}));

const PORTFOLIO_TABS = [
  { id: "holdings", label: "Holdings" },
  { id: "intelligence", label: "Intelligence" },
];

export default function PortfolioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("holdings");
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);

  const checkPortfolio = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("obsidian_portfolio") || "[]");
      setHasPortfolio(Array.isArray(saved) && saved.length > 0);
    } catch {
      setHasPortfolio(false);
    }
  }, []);

  useEffect(() => {
    checkPortfolio();
  }, [checkPortfolio]);

  // Show connect flow if no portfolio
  if (hasPortfolio === false) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-8">
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Portfolio Analytics
        </h1>
        <ConnectPortfolio onComplete={() => { checkPortfolio(); }} />
      </div>
    );
  }

  // Loading state
  if (hasPortfolio === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[12px] text-w4 animate-pulse">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
        Portfolio Analytics
      </h1>

      {/* Summary */}
      <Panel>
        <div className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
              Total Value
            </div>
            <div className="font-mono text-[28px] font-semibold text-w tracking-[-1px]">
              ${formatPrice(PORTFOLIO_SUMMARY.totalValue)}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[13px] text-g">
                +${formatPrice(PORTFOLIO_SUMMARY.dayChange)}
              </span>
              <ChangeBadge value={PORTFOLIO_SUMMARY.dayChangePercent} />
              <span className="text-[10px] text-w5">today</span>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-[10px] text-w5 uppercase tracking-[0.4px]">Total Return</div>
              <div className="font-mono text-[15px] text-g font-medium">
                +${formatPrice(PORTFOLIO_SUMMARY.totalReturn)}
              </div>
              <div className="font-mono text-[11px] text-g">
                {formatPct(PORTFOLIO_SUMMARY.totalReturnPercent)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-w5 uppercase tracking-[0.4px]">YTD Return</div>
              <div className="font-mono text-[15px] text-g font-medium">
                +${formatPrice(PORTFOLIO_SUMMARY.ytdReturn)}
              </div>
              <div className="font-mono text-[11px] text-g">
                {formatPct(PORTFOLIO_SUMMARY.ytdReturnPercent)}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Tab navigation */}
      <Tabs
        tabs={PORTFOLIO_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
        layoutId="portfolio-tab"
      />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "holdings" ? (
          <motion.div
            key="holdings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-[1fr_300px] gap-4 max-lg:grid-cols-1">
              {/* Holdings table */}
              <Panel>
                <PanelHeader label="Holdings" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--brd)] text-[10px] font-mono text-w5">
                        <th className="px-3.5 py-2">Ticker</th>
                        <th className="px-3.5 py-2 text-right">Shares</th>
                        <th className="px-3.5 py-2 text-right">Avg Cost</th>
                        <th className="px-3.5 py-2 text-right">Current</th>
                        <th className="px-3.5 py-2 text-right">Value</th>
                        <th className="px-3.5 py-2 text-right">Weight</th>
                        <th className="px-3.5 py-2 text-right">Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {HOLDINGS.map((h) => {
                        const totalReturn = ((h.current - h.avgCost) / h.avgCost) * 100;
                        return (
                          <tr
                            key={h.ticker}
                            onClick={() => router.push(`/research/${h.ticker}`)}
                            className="border-b border-[var(--brd)] last:border-0 hover:bg-s2/50 transition-colors cursor-pointer"
                          >
                            <td className="px-3.5 py-2">
                              <div className="text-[13px] font-semibold text-w tracking-[-0.2px]">
                                {h.ticker}
                              </div>
                              <div className="text-[10px] text-w4">{h.name}</div>
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[12px] text-w2 text-right">
                              {h.shares}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[12px] text-w3 text-right">
                              ${h.avgCost.toFixed(2)}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[12px] text-w text-right">
                              ${h.current.toFixed(2)}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[12px] text-w2 text-right">
                              ${formatPrice(h.value)}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[11px] text-w3 text-right">
                              {h.weight}%
                            </td>
                            <td className="px-3.5 py-2 text-right">
                              <ChangeBadge value={h.dayChange} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Risk stats */}
                <SharedGrid columns={2}>
                  {STATS.map((stat) => (
                    <SharedGridCell key={stat.label}>
                      <div className="text-[10px] font-semibold tracking-[0.4px] text-w4 uppercase">
                        {stat.label}
                      </div>
                      <div className="font-mono text-[13px] font-medium text-w mt-0.5">
                        {stat.value}
                      </div>
                    </SharedGridCell>
                  ))}
                </SharedGrid>

                {/* Sector allocation */}
                <Panel>
                  <PanelHeader label="Sector Allocation" />
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex rounded-full h-3 overflow-hidden gap-px">
                      {SECTORS.map((s) => (
                        <div
                          key={s.name}
                          className={cn("h-full", s.color)}
                          style={{ width: `${s.weight}%`, opacity: 0.7 }}
                        />
                      ))}
                    </div>
                    {SECTORS.map((s) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-sm", s.color)} style={{ opacity: 0.7 }} />
                          <span className="text-[11px] text-w3">{s.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-w2">{s.weight}%</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="intelligence"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-[1fr_1fr] gap-4 max-lg:grid-cols-1">
              {/* Left column */}
              <div className="space-y-4">
                <PortfolioAlerts holdings={HOLDINGS_DATA} />
                <WhatIfScenarios />
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <PortfolioSimulator holdings={HOLDINGS_DATA} />
                <CorrelationHeatmap />
                <RebalancingSuggestions />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
