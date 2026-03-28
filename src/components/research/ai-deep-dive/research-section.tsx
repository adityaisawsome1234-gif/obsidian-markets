"use client";

import { motion } from "framer-motion";
import { staggerItem } from "@/lib/animations";
import type { ResearchSection as ResearchSectionType } from "@/types/research";
import { ScoreBar } from "./score-bar";
import { FindingList } from "./finding-list";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

interface ResearchSectionProps {
  section: ResearchSectionType;
  icon: React.ReactNode;
  delay?: number;
}

export function ResearchSection({ section, icon, delay = 0 }: ResearchSectionProps) {
  const trendIcon: Record<string, React.ReactNode> = {
    up: <TrendingUp size={10} className="text-g" />,
    down: <TrendingDown size={10} className="text-r" />,
    flat: <Minus size={10} className="text-w5" />,
  };

  return (
    <motion.div
      variants={staggerItem}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      className="bg-s1 border border-[var(--brd)] rounded-[var(--rad)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--brd)]">
        <div className="flex items-center gap-2.5">
          <div className="text-w3">{icon}</div>
          <h3 className="text-[13px] font-semibold text-w tracking-[-0.2px]">
            {section.title}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold tracking-[0.5px] text-w5 uppercase">Score</span>
            <span className={cn(
              "text-[13px] font-bold font-mono",
              section.score >= 60 ? "text-g" : section.score >= 40 ? "text-y" : "text-r"
            )}>
              {section.score}
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--brd)]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold tracking-[0.5px] text-w5 uppercase">Conf</span>
            <span className="text-[11px] font-mono text-w3">{section.confidence}%</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Score bar */}
        <ScoreBar score={section.score} />

        {/* Summary */}
        <p className="text-[12px] text-w2 leading-relaxed">{section.summary}</p>

        {/* Key Findings */}
        <div>
          <div className="text-[9px] font-semibold tracking-[0.6px] text-w4 uppercase mb-2">
            Key Findings
          </div>
          <FindingList findings={section.keyFindings} />
        </div>

        {/* Data Points */}
        {section.dataPoints.length > 0 && (
          <div className="grid grid-cols-2 gap-1 bg-[var(--brd)] rounded-[var(--rad-sm)] overflow-hidden">
            {section.dataPoints.map((dp) => (
              <div key={dp.label} className="bg-s2 px-3 py-2">
                <div className="text-[9px] text-w5 font-medium uppercase tracking-wide">{dp.label}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[13px] font-mono font-semibold text-w">{dp.value}</span>
                  {dp.trend && trendIcon[dp.trend]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
