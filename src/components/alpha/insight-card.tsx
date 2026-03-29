"use client";

import { cn } from "@/lib/cn";
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";
import type { BehavioralInsight } from "@/types/alpha-engine";

const ICONS = {
  strength: TrendingUp,
  weakness: TrendingDown,
  warning: AlertTriangle,
  opportunity: Lightbulb,
} as const;

const COLORS = {
  strength: "text-g border-g/20 bg-g/5",
  weakness: "text-r border-r/20 bg-r/5",
  warning: "text-y border-y/20 bg-y/5",
  opportunity: "text-blue border-blue/20 bg-blue/5",
} as const;

export function InsightCard({ insight }: { insight: BehavioralInsight }) {
  const Icon = ICONS[insight.category];
  const colorClass = COLORS[insight.category];

  return (
    <div className={cn("flex gap-2.5 p-3 rounded-lg border", colorClass)}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-w leading-[1.5]">{insight.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] text-w5 uppercase tracking-[0.3px]">
            {insight.confidence} confidence
          </span>
          {insight.relatedPattern && (
            <span className="text-[9px] text-w5 font-mono">{insight.relatedPattern}</span>
          )}
        </div>
      </div>
    </div>
  );
}
