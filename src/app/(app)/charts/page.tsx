"use client";

import { useState } from "react";
import { PriceChart } from "@/components/research/price-chart";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

const INDICATORS = [
  "SMA (20)", "SMA (50)", "SMA (200)", "EMA (9)", "EMA (21)",
  "RSI (14)", "MACD", "Bollinger Bands", "VWAP", "Volume Profile",
  "Stochastic", "ATR (14)", "OBV", "Ichimoku Cloud", "Fibonacci",
];

export default function ChartsPage() {
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());

  const toggleIndicator = (ind: string) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) {
        next.delete(ind);
      } else {
        next.add(ind);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Advanced Charts
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-w tracking-[-0.2px]">AAPL</span>
          <span className="font-mono text-[14px] text-w">$189.84</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_200px] gap-4 max-lg:grid-cols-1">
        <PriceChart ticker="AAPL" />

        <Panel>
          <PanelHeader
            label="Indicators"
            badge={
              activeIndicators.size > 0 ? (
                <span className="text-[9px] font-mono text-a">
                  {activeIndicators.size} active
                </span>
              ) : undefined
            }
          />
          <div className="p-2 space-y-0.5 max-h-[400px] overflow-y-auto">
            {INDICATORS.map((ind) => {
              const isActive = activeIndicators.has(ind);
              return (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-[11px] rounded transition-colors cursor-pointer flex items-center justify-between",
                    isActive
                      ? "bg-s3 text-w2"
                      : "text-w3 hover:bg-s2 hover:text-w2"
                  )}
                >
                  {ind}
                  {isActive && <Check size={11} className="text-a shrink-0" />}
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
