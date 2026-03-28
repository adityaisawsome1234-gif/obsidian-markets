"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ChevronDown, Clock } from "lucide-react";
import type { Thesis, ThesisAssumption } from "@/types/research";

interface ThesisCardProps {
  thesis: Thesis;
}

const healthColor: Record<Thesis["health"], string> = {
  green: "bg-g",
  yellow: "bg-y",
  red: "bg-r",
};

const healthShadow: Record<Thesis["health"], string> = {
  green: "shadow-[0_0_6px_rgba(34,197,94,0.5)]",
  yellow: "shadow-[0_0_6px_rgba(234,179,8,0.5)]",
  red: "shadow-[0_0_6px_rgba(239,68,68,0.5)]",
};

const assumptionStatusStyle: Record<ThesisAssumption["status"], { label: string; color: string }> = {
  holding: { label: "Holding", color: "text-g" },
  weakening: { label: "Weakening", color: "text-y" },
  broken: { label: "Broken", color: "text-r" },
};

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ThesisCard({ thesis }: ThesisCardProps) {
  const [expanded, setExpanded] = useState(false);

  const holdingCount = thesis.assumptions.filter((a) => a.status === "holding").length;
  const totalCount = thesis.assumptions.length;

  return (
    <motion.div
      layout
      className="bg-s2 border border-[var(--brd)] rounded-[var(--rad)] overflow-hidden cursor-pointer"
      onClick={() => setExpanded((prev) => !prev)}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Health dot with pulse animation */}
        <motion.div
          className={cn(
            "w-2.5 h-2.5 rounded-full shrink-0",
            healthColor[thesis.health],
            healthShadow[thesis.health]
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-w tracking-[-0.2px] truncate">
            {thesis.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-w5">
              {holdingCount}/{totalCount} assumptions holding
            </span>
            <span className="text-[10px] text-w6 flex items-center gap-0.5">
              <Clock size={9} />
              {formatRelativeDate(thesis.updatedAt)}
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-w5 shrink-0"
        >
          <ChevronDown size={14} />
        </motion.div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-[var(--brd)]">
              {/* Description */}
              <p className="text-[12px] text-w3 leading-relaxed pt-3">
                {thesis.description}
              </p>

              {/* Assumptions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold tracking-[0.4px] text-w4 uppercase">
                  Assumptions
                </span>
                <motion.div
                  className="space-y-1"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {thesis.assumptions.map((assumption) => {
                    const style = assumptionStatusStyle[assumption.status];
                    return (
                      <motion.div
                        key={assumption.id}
                        variants={staggerItem}
                        className="flex items-center justify-between py-1.5 px-2 rounded-[var(--rad-sm)] bg-s1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] text-w2 flex-1 min-w-0 truncate">
                          {assumption.description}
                        </span>
                        <span className={cn("text-[10px] font-mono shrink-0 ml-2", style.color)}>
                          {style.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-[10px] text-w5">
                <span>Created: {new Date(thesis.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(thesis.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
