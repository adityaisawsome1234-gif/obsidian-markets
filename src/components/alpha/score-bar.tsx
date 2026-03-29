"use client";

import { cn } from "@/lib/cn";

interface ScoreBarProps {
  score: number;
  max?: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export function ScoreBar({ score, max = 100, label, size = "sm", className }: ScoreBarProps) {
  const pct = Math.min(Math.max((score / max) * 100, 0), 100);
  const color = pct >= 65 ? "bg-g" : pct >= 40 ? "bg-y" : "bg-r";
  const height = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-[10px] text-w4 w-[80px] shrink-0 truncate">{label}</span>
      )}
      <div className={cn("flex-1 rounded-full bg-s3", height)}>
        <div
          className={cn("rounded-full transition-all duration-500", height, color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-w3 w-[32px] text-right shrink-0">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
}

export function ScoreRing({ score, label, size = 56 }: ScoreRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score / 100, 0), 1);
  const strokeDashoffset = circumference * (1 - pct);
  const color = score >= 65 ? "stroke-g" : score >= 40 ? "stroke-y" : "stroke-r";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--s3)"
            strokeWidth={3}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono text-w">
          {score.toFixed(0)}
        </span>
      </div>
      <span className="text-[9px] font-medium text-w4 uppercase tracking-[0.4px]">{label}</span>
    </div>
  );
}
