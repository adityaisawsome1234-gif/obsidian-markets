"use client";

import { motion } from "framer-motion";

interface ScoreBarProps {
  score: number; // 0-100, 50 = neutral
  label?: string;
}

export function ScoreBar({ score, label }: ScoreBarProps) {
  const isPositive = score >= 50;
  const barWidth = Math.abs(score - 50) * 2; // 0-100 scale from center

  return (
    <div className="space-y-1">
      {label && (
        <div className="text-[9px] font-semibold tracking-[0.5px] text-w4 uppercase">{label}</div>
      )}
      <div className="relative h-2 bg-s3 rounded-full overflow-hidden">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-w5" />
        {/* Fill bar */}
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            backgroundColor: isPositive ? "var(--g)" : "var(--r)",
            left: isPositive ? "50%" : undefined,
            right: isPositive ? undefined : "50%",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
      <div className="flex justify-between text-[8px] text-w5 font-mono">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}
