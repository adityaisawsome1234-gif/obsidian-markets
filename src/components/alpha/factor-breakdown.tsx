"use client";

import { cn } from "@/lib/cn";
import { ScoreBar } from "./score-bar";
import type { FactorBreakdown as FactorBreakdownType, FactorCategory } from "@/types/alpha-engine";

const CATEGORY_LABELS: Record<FactorCategory, string> = {
  market_conviction: "Market Conviction",
  personal_edge: "Personal Edge",
  risk_penalty: "Risk Penalty",
};

const CATEGORY_COLORS: Record<FactorCategory, string> = {
  market_conviction: "text-blue",
  personal_edge: "text-g",
  risk_penalty: "text-r",
};

interface FactorBreakdownProps {
  factors: FactorBreakdownType[];
  className?: string;
}

export function FactorBreakdownPanel({ factors, className }: FactorBreakdownProps) {
  const grouped = new Map<FactorCategory, FactorBreakdownType[]>();
  for (const f of factors) {
    const cat = f.factorCategory as FactorCategory;
    const list = grouped.get(cat) ?? [];
    list.push(f);
    grouped.set(cat, list);
  }

  const categories: FactorCategory[] = ["market_conviction", "personal_edge", "risk_penalty"];

  return (
    <div className={cn("space-y-4", className)}>
      {categories.map(cat => {
        const catFactors = grouped.get(cat) ?? [];
        if (catFactors.length === 0) return null;

        const totalContribution = catFactors.reduce((s, f) => s + f.contributionScore, 0);

        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn("text-[10px] font-semibold uppercase tracking-[0.5px]", CATEGORY_COLORS[cat])}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span className="text-[10px] font-mono text-w3">
                {cat === "risk_penalty" ? "-" : "+"}{totalContribution.toFixed(1)}
              </span>
            </div>
            <div className="space-y-2">
              {catFactors.map(f => (
                <div key={f.factorKey}>
                  <ScoreBar
                    score={Math.abs(f.contributionScore)}
                    max={30}
                    label={f.factorLabel}
                    size="sm"
                  />
                  <p className="text-[10px] text-w5 mt-0.5 ml-[88px] leading-[1.4]">
                    {f.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
