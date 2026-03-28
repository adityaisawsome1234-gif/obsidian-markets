"use client";

import { motion } from "framer-motion";
import type { SignalRadar as SignalRadarType } from "@/types/research";
import { Badge } from "@/components/ui/badge";

interface SignalRadarProps {
  signals: SignalRadarType;
}

const axes = [
  { key: "fundamental" as const, label: "Fundamental", angle: -90 },
  { key: "technical" as const, label: "Technical", angle: -18 },
  { key: "macro" as const, label: "Macro", angle: 54 },
  { key: "optionsFlow" as const, label: "Options", angle: 126 },
  { key: "sentiment" as const, label: "Sentiment", angle: 198 },
];

export function SignalRadar({ signals }: SignalRadarProps) {
  const cx = 130;
  const cy = 130;
  const maxR = 100;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const getPoint = (angle: number, value: number) => ({
    x: cx + Math.cos(toRad(angle)) * (value / 100) * maxR,
    y: cy + Math.sin(toRad(angle)) * (value / 100) * maxR,
  });

  // Build polygon points
  const dataPoints = axes.map((a) => getPoint(a.angle, signals[a.key]));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Background rings at 25%, 50%, 75%, 100%
  const rings = [25, 50, 75, 100];

  const getColor = (s: number) => {
    if (s >= 65) return "var(--g)";
    if (s >= 45) return "var(--y)";
    return "var(--r)";
  };

  const isStrong = signals.convergenceStrength === "strong";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="260" height="260" viewBox="0 0 260 260">
        {/* Background rings */}
        {rings.map((r) => {
          const ringPoints = axes
            .map((a) => getPoint(a.angle, r))
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ") + " Z";
          return (
            <path
              key={r}
              d={ringPoints}
              fill="none"
              stroke="var(--brd)"
              strokeWidth="1"
              opacity={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {axes.map((a) => {
          const tip = getPoint(a.angle, 100);
          return (
            <line
              key={a.key}
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke="var(--brd)"
              strokeWidth="1"
              opacity={0.3}
            />
          );
        })}

        {/* Data polygon */}
        <motion.path
          d={dataPath}
          fill="var(--a)"
          fillOpacity={0.12}
          stroke="var(--a)"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          filter={isStrong ? "url(#glow)" : undefined}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={axes[i].key}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={getColor(signals[axes[i].key])}
            stroke="var(--s1)"
            strokeWidth="2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
          />
        ))}

        {/* Labels */}
        {axes.map((a) => {
          const labelR = maxR + 20;
          const pos = {
            x: cx + Math.cos(toRad(a.angle)) * labelR,
            y: cy + Math.sin(toRad(a.angle)) * labelR,
          };
          const score = signals[a.key];
          return (
            <g key={`label-${a.key}`}>
              <text
                x={pos.x}
                y={pos.y - 6}
                textAnchor="middle"
                className="fill-w3 text-[10px] font-medium"
              >
                {a.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 7}
                textAnchor="middle"
                className="font-mono text-[11px] font-bold"
                fill={getColor(score)}
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* Convergence badge */}
      <div className="flex items-center gap-2">
        <Badge variant={isStrong ? "ai" : signals.convergenceStrength === "moderate" ? "warning" : "neutral"}>
          {signals.convergenceStrength === "strong" ? "STRONG SIGNAL" :
           signals.convergenceStrength === "moderate" ? "MODERATE CONVERGENCE" :
           signals.convergenceStrength === "weak" ? "WEAK SIGNALS" : "CONFLICTING"}
        </Badge>
      </div>
    </div>
  );
}
