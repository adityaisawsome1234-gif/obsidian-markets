"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

interface SparklineAreaProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  positive?: boolean;
}

export function SparklineArea({
  data,
  width = 120,
  height = 32,
  className,
  positive = true,
}: SparklineAreaProps) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  const color = positive ? "var(--g)" : "var(--r)";
  // Use a deterministic ID based on data to avoid SSR/client hydration mismatch
  const hash = data.length > 0 ? Math.abs(data.reduce((a, b) => a + b * 31, 0) | 0).toString(36) : "0";
  const gradId = `spark-${positive ? "u" : "d"}-${hash}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-hidden", className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill={`url(#${gradId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}
