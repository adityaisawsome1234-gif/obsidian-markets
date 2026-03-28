"use client";

import { cn } from "@/lib/cn";
import { Shield, Database, BarChart3, Zap } from "lucide-react";

type RiskLabel = "factual" | "analysis" | "speculative";

interface ComplianceBadgeProps {
  riskLabel: RiskLabel;
  className?: string;
  showIcon?: boolean;
}

const LABEL_CONFIG: Record<RiskLabel, { text: string; color: string; bg: string; border: string; icon: typeof Database }> = {
  factual: {
    text: "Factual",
    color: "text-g",
    bg: "bg-[var(--gbg)]",
    border: "border-g/20",
    icon: Database,
  },
  analysis: {
    text: "Analysis",
    color: "text-a",
    bg: "bg-[var(--abg)]",
    border: "border-a/20",
    icon: BarChart3,
  },
  speculative: {
    text: "Speculative",
    color: "text-y",
    bg: "bg-[var(--ybg)]",
    border: "border-y/20",
    icon: Zap,
  },
};

/**
 * Displays the risk classification label next to AI badges.
 * Sets user expectations about the confidence level of AI output.
 *
 * - Factual (green): pure data retrieval
 * - Analysis (purple): interpretation of data
 * - Speculative (yellow): forward-looking predictions
 */
export function ComplianceBadge({ riskLabel, className, showIcon = true }: ComplianceBadgeProps) {
  const config = LABEL_CONFIG[riskLabel];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[8px] font-bold tracking-[0.4px] uppercase px-1.5 py-0.5 rounded border",
        config.bg,
        config.color,
        config.border,
        className
      )}
      title={`Risk level: ${riskLabel}. ${riskLabel === "factual" ? "Pure data retrieval." : riskLabel === "analysis" ? "Interpretation of market data." : "Forward-looking statements based on models and patterns."}`}
    >
      {showIcon && <Icon size={8} />}
      {config.text}
    </span>
  );
}

/**
 * Minimal inline version for tight spaces.
 */
export function ComplianceDot({ riskLabel, className }: { riskLabel: RiskLabel; className?: string }) {
  const config = LABEL_CONFIG[riskLabel];
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={`Risk: ${riskLabel}`}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.color.replace("text-", "bg-"))} />
      <span className={cn("text-[8px] font-semibold uppercase tracking-[0.3px]", config.color)}>
        {config.text}
      </span>
    </span>
  );
}
