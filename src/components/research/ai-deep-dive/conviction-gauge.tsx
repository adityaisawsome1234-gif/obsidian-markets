"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/shared/animated-number";

interface ConvictionGaugeProps {
  score: number; // 0-100
  verdict: string;
}

export function ConvictionGauge({ score, verdict }: ConvictionGaugeProps) {
  const radius = 70;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;

  // Color: red (0) -> yellow (50) -> green (100)
  const getColor = (s: number) => {
    if (s < 30) return "#ef4444";
    if (s < 45) return "#f97316";
    if (s < 55) return "#eab308";
    if (s < 70) return "#84cc16";
    return "#22c55e";
  };

  const color = getColor(score);

  const verdictColor: Record<string, string> = {
    "Strong Buy": "text-g",
    Buy: "text-g",
    Hold: "text-y",
    Sell: "text-r",
    "Strong Sell": "text-r",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="160" height="90" viewBox="0 0 160 90">
          {/* Background arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="var(--s3)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Animated progress arc */}
          <motion.path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <AnimatedNumber
            value={score}
            format={(n) => Math.round(n).toString()}
            className="text-[28px] font-bold text-w tracking-tight"
          />
        </div>
      </div>
      <div className="text-center -mt-1">
        <div className="text-[9px] font-semibold tracking-[0.8px] text-w4 uppercase">
          Conviction Score
        </div>
        <div className={`text-[14px] font-bold tracking-[-0.3px] mt-0.5 ${verdictColor[verdict] || "text-w3"}`}>
          {verdict}
        </div>
      </div>
    </div>
  );
}
