"use client";

import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

interface OptionLeg {
  strike: number;
  openInterest: number;
  gamma: number;
  type: "call" | "put";
}

interface Props {
  ticker: string;
  underlyingPrice: number;
  calls: OptionLeg[];
  puts: OptionLeg[];
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

export function GexChart({ ticker, underlyingPrice, calls, puts }: Props) {
  const W = 700, H = 300;
  const PAD = { top: 16, right: 56, bottom: 28, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { strikes, callGex, putGex, netGex, maxGex, minGex, maxGammaStrike, totalCallGex, totalPutGex, totalNet } =
    useMemo(() => {
      const spot2 = underlyingPrice * underlyingPrice;
      const callMap = new Map<number, number>();
      const putMap = new Map<number, number>();

      for (const c of calls) {
        callMap.set(c.strike, (callMap.get(c.strike) ?? 0) + c.openInterest * c.gamma * 100 * spot2 * 0.01);
      }
      for (const p of puts) {
        putMap.set(p.strike, (putMap.get(p.strike) ?? 0) - p.openInterest * p.gamma * 100 * spot2 * 0.01);
      }

      const allStrikes = [...new Set([...callMap.keys(), ...putMap.keys()])].sort((a, b) => a - b);
      const cGex = allStrikes.map((k) => callMap.get(k) ?? 0);
      const pGex = allStrikes.map((k) => putMap.get(k) ?? 0);
      const nGex = allStrikes.map((_, i) => cGex[i] + pGex[i]);

      let maxG = -Infinity, minG = Infinity, maxStrike = allStrikes[0] ?? 0;
      let tCall = 0, tPut = 0;
      for (let i = 0; i < allStrikes.length; i++) {
        if (cGex[i] > maxG) maxG = cGex[i];
        if (pGex[i] < minG) minG = pGex[i];
        if (Math.abs(nGex[i]) > Math.abs(nGex[allStrikes.indexOf(maxStrike)] ?? 0)) maxStrike = allStrikes[i];
        tCall += cGex[i];
        tPut += pGex[i];
      }

      // find max abs net gex strike
      let maxAbsNet = 0;
      for (let i = 0; i < allStrikes.length; i++) {
        if (Math.abs(nGex[i]) > maxAbsNet) { maxAbsNet = Math.abs(nGex[i]); maxStrike = allStrikes[i]; }
      }

      return {
        strikes: allStrikes, callGex: cGex, putGex: pGex, netGex: nGex,
        maxGex: Math.max(maxG, 0), minGex: Math.min(minG, 0),
        maxGammaStrike: maxStrike, totalCallGex: tCall, totalPutGex: tPut, totalNet: tCall + tPut,
      };
    }, [calls, puts, underlyingPrice]);

  const range = (maxGex - minGex) || 1;
  const y = (v: number) => PAD.top + chartH * (1 - (v - minGex) / range);
  const zeroY = y(0);
  const barW = Math.max(1, Math.min(10, (chartW / Math.max(strikes.length, 1)) * 0.38));
  const gridCount = 6;
  const gridStep = range / gridCount;
  const labelEvery = Math.max(1, Math.floor(strikes.length / 14));

  const priceX = strikes.length > 1
    ? PAD.left + ((underlyingPrice - strikes[0]) / (strikes[strikes.length - 1] - strikes[0])) * chartW
    : PAD.left + chartW / 2;

  const stats = [
    { label: "Max Gamma Strike", value: `$${maxGammaStrike}` },
    { label: "Net GEX", value: `$${fmt(totalNet)}`, color: totalNet >= 0 ? "text-g" : "text-r" },
    { label: "Call GEX", value: `$${fmt(totalCallGex)}`, color: "text-g" },
    { label: "Put GEX", value: `$${fmt(totalPutGex)}`, color: "text-r" },
  ];

  return (
    <Panel>
      <PanelHeader label="Gamma Exposure (GEX)" badge={<Badge variant="ai">{ticker}</Badge>} />
      <div className="px-3 pt-2 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
          {/* grid lines */}
          {Array.from({ length: gridCount + 1 }, (_, i) => {
            const val = minGex + gridStep * i;
            const yPos = y(val);
            return (
              <g key={`g${i}`}>
                <line x1={PAD.left} y1={yPos} x2={W - PAD.right} y2={yPos} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                <text x={W - PAD.right + 4} y={yPos + 3} fill="var(--w5)" fontSize={8} fontFamily="monospace">{fmt(val)}</text>
              </g>
            );
          })}

          {/* zero line */}
          <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />

          {/* bars */}
          {strikes.map((k, i) => {
            const x = PAD.left + (i / Math.max(strikes.length - 1, 1)) * chartW;
            const isMax = k === maxGammaStrike;
            return (
              <g key={k}>
                {callGex[i] > 0 && (
                  <motion.rect
                    initial={{ height: 0, y: zeroY }}
                    animate={{ height: zeroY - y(callGex[i]), y: y(callGex[i]) }}
                    transition={{ duration: 0.5, delay: i * 0.003 }}
                    x={x - barW} width={barW} fill={isMax ? "#4ade80" : "var(--g)"} opacity={isMax ? 1 : 0.7} rx={0.5}
                  />
                )}
                {putGex[i] < 0 && (
                  <motion.rect
                    initial={{ height: 0, y: zeroY }}
                    animate={{ height: y(putGex[i]) - zeroY, y: zeroY }}
                    transition={{ duration: 0.5, delay: i * 0.003 }}
                    x={x} width={barW} fill={isMax ? "#f87171" : "var(--r)"} opacity={isMax ? 1 : 0.7} rx={0.5}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={x} y={H - 4} fill="var(--w5)" fontSize={8} fontFamily="monospace" textAnchor="middle">{k}</text>
                )}
              </g>
            );
          })}

          {/* current price line */}
          <line x1={priceX} y1={PAD.top} x2={priceX} y2={H - PAD.bottom} stroke="var(--w)" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
          <text x={priceX} y={PAD.top - 3} fill="var(--w)" fontSize={8} fontFamily="monospace" textAnchor="middle">${underlyingPrice}</text>

          {/* max gamma label */}
          {strikes.length > 0 && (
            <text
              x={PAD.left + ((strikes.indexOf(maxGammaStrike)) / Math.max(strikes.length - 1, 1)) * chartW}
              y={PAD.top + 10} fill="#4ade80" fontSize={7} fontFamily="monospace" textAnchor="middle"
            >MAX {maxGammaStrike}</text>
          )}
        </svg>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-4 border-t border-[var(--brd)]">
        {stats.map((s, i) => (
          <div key={s.label} className={cn("px-3 py-2", i < 3 && "border-r border-[var(--brd)]")}>
            <div className="text-[9px] uppercase tracking-[0.5px] text-w5 font-medium">{s.label}</div>
            <div className={cn("text-[13px] font-mono font-semibold mt-0.5", s.color ?? "text-w")}>{s.value}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
