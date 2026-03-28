"use client";

import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";
import { Sparkles, ArrowRight, Shield, TrendingDown, Wallet } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  icon: React.ReactNode;
  reasoning: string;
  impact: string;
  priority: "high" | "medium";
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: "reduce-nvda",
    title: "Reduce NVDA from 15.9% to 12%",
    icon: <TrendingDown size={14} />,
    reasoning:
      "NVDA concentration exceeds risk threshold. A 4% trim locks in gains and reduces single-stock exposure. Current P/E of 65x suggests elevated downside risk on any earnings miss.",
    impact: "Reduces portfolio max drawdown by ~1.8%",
    priority: "high",
  },
  {
    id: "add-defensive",
    title: "Add defensive positions (utilities, staples)",
    icon: <Shield size={14} />,
    reasoning:
      "Portfolio beta of 1.12 leaves you overexposed to market downturns. Adding 5-8% in XLU or XLP would improve risk-adjusted returns and provide dividend income during volatile periods.",
    impact: "Improves Sharpe ratio by ~0.15",
    priority: "high",
  },
  {
    id: "increase-cash",
    title: "Increase cash allocation to 8%",
    icon: <Wallet size={14} />,
    reasoning:
      "Current cash at 4.6% is below recommended 7-10% for this market environment. Building dry powder ahead of potential Fed decision volatility provides optionality for dip buying.",
    impact: "Adds $8,400 buying power reserve",
    priority: "medium",
  },
  {
    id: "trim-overlap",
    title: "Reduce MSFT/GOOGL overlap exposure",
    icon: <ArrowRight size={14} />,
    reasoning:
      "MSFT and GOOGL show 0.84 correlation with overlapping cloud/AI revenue drivers. Combined 21.5% weight creates concentration risk. Consider trimming one position by 3-4%.",
    impact: "Reduces correlated drawdown risk by ~2.3%",
    priority: "medium",
  },
];

export function RebalancingSuggestions() {
  return (
    <Panel>
      <PanelHeader
        label="Rebalancing Suggestions"
        badge={<Badge variant="ai">AI</Badge>}
        actions={
          <span className="text-[9px] font-mono text-w5 flex items-center gap-1">
            <Sparkles size={9} className="text-a" />
            AI-powered
          </span>
        }
      />
      <motion.div
        className="p-3.5 space-y-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {SUGGESTIONS.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            variants={staggerItem}
            className={cn(
              "bg-s2 rounded-[var(--rad-sm)] overflow-hidden",
              "border border-[var(--abr)] border-opacity-40"
            )}
          >
            <div className="p-3 space-y-2">
              {/* Header */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-[var(--rad-sm)] bg-[var(--abg)] flex items-center justify-center text-a shrink-0">
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-w tracking-[-0.2px]">
                      {suggestion.title}
                    </span>
                    {suggestion.priority === "high" && (
                      <Badge variant="warning">High</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Reasoning */}
              <p className="text-[11px] text-w3 leading-relaxed pl-[38px]">
                {suggestion.reasoning}
              </p>

              {/* Impact + Action */}
              <div className="flex items-center justify-between pl-[38px]">
                <span className="text-[10px] text-a font-mono">
                  {suggestion.impact}
                </span>
                <Button variant="outline" size="sm">
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Panel>
  );
}
