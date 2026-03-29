"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown, ChevronUp, Check, X, Bookmark } from "lucide-react";
import { ScoreRing } from "./score-bar";
import { FactorBreakdownPanel } from "./factor-breakdown";
import type { RecommendationItem } from "@/types/alpha-engine";

interface RecommendationCardProps {
  item: RecommendationItem;
  onAction?: (id: string, action: string) => void;
}

export function RecommendationCard({ item, onAction }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const actionColor = item.actionType === "buy" ? "text-g" : item.actionType === "sell" ? "text-r" : "text-y";
  const confidenceLabel = item.confidenceLevel === "high"
    ? "High confidence"
    : item.confidenceLevel === "medium"
      ? "Medium confidence"
      : "Low confidence — limited history";

  return (
    <div className="bg-s1 border border-[var(--brd)] rounded-[var(--rad)] overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-w tracking-[-0.3px]">{item.symbol}</span>
            <span className={cn("text-[10px] font-semibold uppercase tracking-[0.5px]", actionColor)}>
              {item.actionType}
            </span>
            {item.sector && (
              <span className="text-[9px] text-w5 bg-s3 px-1.5 py-0.5 rounded">{item.sector}</span>
            )}
          </div>
          <p className="text-[11px] text-w3 mt-1 leading-[1.4] line-clamp-2">
            {item.rationaleSummary}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[9px] text-w5">{confidenceLabel}</span>
            {item.suggestedStrategy && (
              <span className="text-[9px] text-w5 font-mono">{item.suggestedStrategy}</span>
            )}
          </div>
        </div>

        {/* Score rings */}
        <div className="flex items-center gap-2 shrink-0">
          <ScoreRing score={item.finalScore} label="Score" size={48} />
          <ScoreRing score={item.tradeFitScore} label="Fit" size={48} />
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center border-t border-[var(--brd)] px-3.5 py-1.5 gap-1.5">
        {item.status === "generated" || item.status === "viewed" ? (
          <>
            <button
              onClick={() => onAction?.(item.id, "accepted")}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-g hover:bg-g/10 rounded transition-colors"
            >
              <Check size={11} /> Accept
            </button>
            <button
              onClick={() => onAction?.(item.id, "rejected")}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-w4 hover:bg-r/10 hover:text-r rounded transition-colors"
            >
              <X size={11} /> Dismiss
            </button>
            <button
              onClick={() => onAction?.(item.id, "clicked")}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-w4 hover:bg-blue/10 hover:text-blue rounded transition-colors"
            >
              <Bookmark size={11} /> Save
            </button>
          </>
        ) : (
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded",
            item.status === "accepted" ? "text-g bg-g/10" :
            item.status === "rejected" ? "text-r bg-r/10" :
            "text-w4 bg-s3",
          )}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] text-w4 hover:text-w transition-colors"
        >
          Factors {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Expandable factor breakdown */}
      {expanded && (
        <div className="border-t border-[var(--brd)] px-3.5 py-3 bg-s2/50">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div className="text-[10px] text-w5 mb-0.5">Market Conviction</div>
              <div className="text-[14px] font-mono font-bold text-blue">{item.marketConvictionScore.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-w5 mb-0.5">Personal Edge</div>
              <div className="text-[14px] font-mono font-bold text-g">{item.personalEdgeScore.toFixed(0)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-w5 mb-0.5">Risk Penalty</div>
              <div className="text-[14px] font-mono font-bold text-r">-{item.riskPenaltyScore.toFixed(0)}</div>
            </div>
          </div>
          <FactorBreakdownPanel factors={item.factors} />
        </div>
      )}
    </div>
  );
}
