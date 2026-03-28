"use client";

import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";
import { TrendingDown, TrendingUp, Zap, Fuel, Globe2, Cpu } from "lucide-react";
import { useState } from "react";

interface Scenario {
  id: string;
  title: string;
  icon: React.ReactNode;
  impact: number; // dollar P&L impact
  impactPercent: number;
  description: string;
  affectedHoldings: { ticker: string; impact: number }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "fed-hike",
    title: "Fed Raises Rates 50bps",
    icon: <Zap size={14} />,
    impact: -8420,
    impactPercent: -3.4,
    description: "Higher rates pressure growth multiples. Tech names most exposed due to duration sensitivity.",
    affectedHoldings: [
      { ticker: "NVDA", impact: -5.2 },
      { ticker: "MSFT", impact: -3.1 },
      { ticker: "JPM", impact: 1.8 },
    ],
  },
  {
    id: "oil-spike",
    title: "Oil Spikes to $120/bbl",
    icon: <Fuel size={14} />,
    impact: -5180,
    impactPercent: -2.1,
    description: "Energy cost inflation compresses margins across consumer and tech. Financials benefit from higher loan rates.",
    affectedHoldings: [
      { ticker: "AMZN", impact: -4.1 },
      { ticker: "AAPL", impact: -2.3 },
      { ticker: "JPM", impact: 0.9 },
    ],
  },
  {
    id: "china-gdp",
    title: "China GDP Drops Below 4%",
    icon: <Globe2 size={14} />,
    impact: -11250,
    impactPercent: -4.5,
    description: "Weakened demand from China reduces revenue for multinationals. Semiconductor supply chain disruption likely.",
    affectedHoldings: [
      { ticker: "NVDA", impact: -7.8 },
      { ticker: "AAPL", impact: -4.2 },
      { ticker: "GOOGL", impact: -2.1 },
    ],
  },
  {
    id: "ai-decel",
    title: "AI Capex Cycle Decelerates",
    icon: <Cpu size={14} />,
    impact: -14320,
    impactPercent: -5.8,
    description: "Reduced AI infrastructure spending hits semiconductor and cloud names. Rotation into value likely.",
    affectedHoldings: [
      { ticker: "NVDA", impact: -12.4 },
      { ticker: "MSFT", impact: -4.6 },
      { ticker: "GOOGL", impact: -3.2 },
    ],
  },
];

function formatDollar(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function WhatIfScenarios() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  return (
    <Panel>
      <PanelHeader
        label="What-If Scenarios"
        badge={<Badge variant="ai">AI</Badge>}
      />
      <motion.div
        className="p-3.5 space-y-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {SCENARIOS.map((scenario) => {
          const isExpanded = activeScenario === scenario.id;
          const isPositive = scenario.impact >= 0;

          return (
            <motion.div
              key={scenario.id}
              variants={staggerItem}
              layout
              onClick={() =>
                setActiveScenario(isExpanded ? null : scenario.id)
              }
              className="bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] overflow-hidden cursor-pointer hover:border-[var(--brd2)] transition-colors"
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Icon */}
                <div className="w-7 h-7 rounded-[var(--rad-sm)] bg-s3 flex items-center justify-center text-w4 shrink-0">
                  {scenario.icon}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-w tracking-[-0.2px] truncate">
                    {scenario.title}
                  </div>
                </div>

                {/* P&L Impact */}
                <div className="text-right shrink-0">
                  <AnimatedNumber
                    value={scenario.impact}
                    format={formatDollar}
                    className={cn(
                      "text-[13px] font-semibold",
                      isPositive ? "text-g" : "text-r"
                    )}
                  />
                  <div
                    className={cn(
                      "text-[10px] font-mono",
                      isPositive ? "text-g" : "text-r"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {scenario.impactPercent}%
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 pb-3 border-t border-[var(--brd)]"
                >
                  <p className="text-[11px] text-w3 leading-relaxed pt-2.5">
                    {scenario.description}
                  </p>
                  <div className="mt-2 space-y-1">
                    <span className="text-[9px] font-semibold tracking-[0.4px] text-w5 uppercase">
                      Most Affected
                    </span>
                    {scenario.affectedHoldings.map((h) => (
                      <div
                        key={h.ticker}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-[11px] font-mono text-w2">
                          {h.ticker}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-mono flex items-center gap-0.5",
                            h.impact >= 0 ? "text-g" : "text-r"
                          )}
                        >
                          {h.impact >= 0 ? (
                            <TrendingUp size={10} />
                          ) : (
                            <TrendingDown size={10} />
                          )}
                          {h.impact >= 0 ? "+" : ""}
                          {h.impact}%
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </Panel>
  );
}
