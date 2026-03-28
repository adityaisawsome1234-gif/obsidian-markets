"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";

interface OptionPoint {
  strike: number;
  expiration: string;
  impliedVolatility: number;
}

interface Props {
  ticker: string;
  underlyingPrice: number;
  calls: OptionPoint[];
  puts: OptionPoint[];
  expirations: string[];
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ivToColor(iv: number, minIV: number, maxIV: number): string {
  const t = maxIV === minIV ? 0.5 : Math.min(Math.max((iv - minIV) / (maxIV - minIV), 0), 1);
  if (t < 0.5) {
    const s = t * 2;
    return `rgb(${Math.round(lerp(59, 234, s))},${Math.round(lerp(130, 179, s))},${Math.round(lerp(246, 8, s))})`;
  }
  const s = (t - 0.5) * 2;
  return `rgb(${Math.round(lerp(234, 239, s))},${Math.round(lerp(179, 68, s))},${Math.round(lerp(8, 68, s))})`;
}

function ivRankColor(v: number) {
  if (v < 30) return "text-g";
  if (v <= 60) return "text-y";
  return "text-r";
}

export function IVSurface({ ticker, underlyingPrice, calls, puts, expirations }: Props) {
  const computed = useMemo(() => {
    const allContracts = [...calls, ...puts];
    const strikes = [...new Set(allContracts.map((c) => c.strike))].sort((a, b) => a - b);
    const baseExp = expirations[0] ?? allContracts[0]?.expiration ?? "";

    // Build IV map for base expiration from both calls and puts (average)
    const baseIVMap = new Map<number, number>();
    for (const c of allContracts) {
      if (c.expiration === baseExp && c.impliedVolatility > 0) {
        const prev = baseIVMap.get(c.strike);
        baseIVMap.set(c.strike, prev ? (prev + c.impliedVolatility) / 2 : c.impliedVolatility);
      }
    }

    // Extrapolate IV grid across expirations
    const sortedExps = [...expirations].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const baseIdx = sortedExps.indexOf(baseExp);
    const grid: number[][] = []; // [expIdx][strikeIdx]
    let minIV = Infinity, maxIV = -Infinity;

    for (let ei = 0; ei < sortedExps.length; ei++) {
      const row: number[] = [];
      const offset = ei - (baseIdx >= 0 ? baseIdx : 0);
      const mult = offset < 0 ? 1 + 0.05 * Math.abs(offset) : offset > 0 ? 1 - 0.03 * offset : 1;
      for (let si = 0; si < strikes.length; si++) {
        const base = baseIVMap.get(strikes[si]) ?? 0.3;
        const iv = Math.max(base * Math.min(Math.max(mult, 0.7), 1.2), 0.05);
        row.push(iv);
        if (iv < minIV) minIV = iv;
        if (iv > maxIV) maxIV = iv;
      }
      grid.push(row);
    }

    // ATM: closest strike to underlying
    const atmIdx = strikes.reduce(
      (best, s, i) => (Math.abs(s - underlyingPrice) < Math.abs(strikes[best] - underlyingPrice) ? i : best), 0
    );

    // Term structure: ATM IV per expiration
    const termStructure = sortedExps.map((_, ei) => grid[ei][atmIdx]);

    // Skew: IV across strikes for nearest expiration
    const skew = grid[0] ?? [];

    // IV Rank: synthetic (based on where ATM IV sits in a reasonable range)
    const atmIV = grid[baseIdx >= 0 ? baseIdx : 0]?.[atmIdx] ?? 0.3;
    const ivRank = Math.round(Math.min(Math.max(((atmIV - 0.15) / 0.6) * 100, 0), 100));

    // Skew ratio: approximate 25-delta puts vs calls
    const putIdx = Math.max(0, Math.round(atmIdx * 0.75));
    const callIdx = Math.min(strikes.length - 1, Math.round(atmIdx * 1.25));
    const skewRatio = skew[callIdx] > 0 ? skew[putIdx] / skew[callIdx] : 1;

    return { strikes, sortedExps, grid, minIV, maxIV, atmIdx, termStructure, skew, atmIV, ivRank, skewRatio };
  }, [calls, puts, expirations, underlyingPrice]);

  const { strikes, sortedExps, grid, minIV, maxIV, atmIdx, termStructure, skew, atmIV, ivRank, skewRatio } = computed;

  // Heatmap dims
  const hPad = { l: 52, r: 12, t: 8, b: 28 };
  const hW = 600, hH = 280;
  const cellW = strikes.length > 0 ? (hW - hPad.l - hPad.r) / strikes.length : 0;
  const cellH = sortedExps.length > 0 ? (hH - hPad.t - hPad.b) / sortedExps.length : 0;

  // Chart dims
  const cPad = { l: 44, r: 12, t: 12, b: 24 };
  const cW = 600, cH = 150;
  const chartW = cW - cPad.l - cPad.r;
  const chartH = cH - cPad.t - cPad.b;

  // ATM vertical line x position in heatmap
  const atmX = hPad.l + (atmIdx + 0.5) * cellW;

  function buildLinePath(values: number[], count: number, w: number, h: number) {
    if (count < 2) return "";
    const yMin = Math.min(...values), yMax = Math.max(...values);
    const yRange = yMax - yMin || 0.01;
    return values
      .map((v, i) => {
        const x = (i / (count - 1)) * w;
        const y = h - ((v - yMin) / yRange) * h;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  return (
    <Panel delay={0.1}>
      <PanelHeader label="IV Surface" badge={<Badge variant="ai">Surface</Badge>} />

      <div className="px-3.5 py-3 space-y-4">
        {/* Heatmap */}
        <svg viewBox={`0 0 ${hW} ${hH}`} className="w-full" style={{ height: 280 }}>
          {grid.map((row, ei) =>
            row.map((iv, si) => (
              <rect
                key={`${ei}-${si}`}
                x={hPad.l + si * cellW}
                y={hPad.t + ei * cellH}
                width={cellW + 0.5}
                height={cellH + 0.5}
                fill={ivToColor(iv, minIV, maxIV)}
                opacity={0.85}
              />
            ))
          )}
          {/* ATM vertical line */}
          <line x1={atmX} y1={hPad.t} x2={atmX} y2={hH - hPad.b} stroke="var(--w)" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
          {/* X-axis: strikes */}
          {strikes.map((s, i) =>
            i % Math.max(1, Math.floor(strikes.length / 8)) === 0 ? (
              <text key={`xs-${i}`} x={hPad.l + (i + 0.5) * cellW} y={hH - 6} textAnchor="middle" className="fill-w5 font-mono" style={{ fontSize: 8 }}>
                {s}
              </text>
            ) : null
          )}
          {/* Y-axis: expirations */}
          {sortedExps.map((exp, i) => (
            <text key={`ye-${i}`} x={hPad.l - 4} y={hPad.t + (i + 0.6) * cellH} textAnchor="end" className="fill-w5 font-mono" style={{ fontSize: 8 }}>
              {fmtDate(exp)}
            </text>
          ))}
        </svg>

        {/* Color legend */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[9px] text-w5 font-mono">{(minIV * 100).toFixed(0)}%</span>
          <div className="flex-1 h-2 rounded-sm overflow-hidden flex">
            {Array.from({ length: 40 }, (_, i) => (
              <div key={i} className="flex-1" style={{ background: ivToColor(lerp(minIV, maxIV, i / 39), minIV, maxIV) }} />
            ))}
          </div>
          <span className="text-[9px] text-w5 font-mono">{(maxIV * 100).toFixed(0)}%</span>
        </div>

        {/* IV Term Structure */}
        <div>
          <span className="text-[9px] font-semibold tracking-[0.5px] text-w4 uppercase">Term Structure</span>
          <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" style={{ height: 150 }}>
            <path
              d={buildLinePath(termStructure, termStructure.length, chartW, chartH).replace(/([ML])([\d.]+),([\d.]+)/g, (_, cmd, x, y) => `${cmd}${parseFloat(x) + cPad.l},${parseFloat(y) + cPad.t}`)}
              fill="none" stroke="#3b82f6" strokeWidth={1.5}
            />
            {termStructure.map((v, i) => {
              const yMin = Math.min(...termStructure), yMax = Math.max(...termStructure);
              const yRange = yMax - yMin || 0.01;
              const x = cPad.l + (termStructure.length > 1 ? (i / (termStructure.length - 1)) * chartW : 0);
              const y = cPad.t + chartH - ((v - yMin) / yRange) * chartH;
              return <circle key={i} cx={x} cy={y} r={3} fill="#3b82f6" />;
            })}
            {/* X labels */}
            {sortedExps.map((exp, i) =>
              i % Math.max(1, Math.floor(sortedExps.length / 6)) === 0 ? (
                <text key={i} x={cPad.l + (sortedExps.length > 1 ? (i / (sortedExps.length - 1)) * chartW : 0)} y={cH - 4} textAnchor="middle" className="fill-w5 font-mono" style={{ fontSize: 8 }}>
                  {fmtDate(exp)}
                </text>
              ) : null
            )}
            {/* Y labels */}
            {[0, 0.5, 1].map((t, i) => {
              const yMin = Math.min(...termStructure), yMax = Math.max(...termStructure);
              const v = lerp(yMin, yMax, t);
              return (
                <text key={i} x={cPad.l - 4} y={cPad.t + chartH - t * chartH + 3} textAnchor="end" className="fill-w5 font-mono" style={{ fontSize: 8 }}>
                  {(v * 100).toFixed(0)}%
                </text>
              );
            })}
          </svg>
        </div>

        {/* IV Skew */}
        <div>
          <span className="text-[9px] font-semibold tracking-[0.5px] text-w4 uppercase">IV Skew</span>
          <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" style={{ height: 150 }}>
            <path
              d={buildLinePath(skew, skew.length, chartW, chartH).replace(/([ML])([\d.]+),([\d.]+)/g, (_, cmd, x, y) => `${cmd}${parseFloat(x) + cPad.l},${parseFloat(y) + cPad.t}`)}
              fill="none" stroke="#a78bfa" strokeWidth={1.5}
            />
            {skew.length > 0 && (() => {
              const yMin = Math.min(...skew), yMax = Math.max(...skew);
              const yRange = yMax - yMin || 0.01;
              const x = cPad.l + (skew.length > 1 ? (atmIdx / (skew.length - 1)) * chartW : 0);
              const y = cPad.t + chartH - ((skew[atmIdx] - yMin) / yRange) * chartH;
              return <circle cx={x} cy={y} r={4} fill="#a78bfa" stroke="var(--s1)" strokeWidth={2} />;
            })()}
            {/* X labels */}
            {strikes.map((s, i) =>
              i % Math.max(1, Math.floor(strikes.length / 8)) === 0 ? (
                <text key={i} x={cPad.l + (strikes.length > 1 ? (i / (strikes.length - 1)) * chartW : 0)} y={cH - 4} textAnchor="middle" className="fill-w5 font-mono" style={{ fontSize: 8 }}>
                  {s}
                </text>
              ) : null
            )}
            {/* Y labels */}
            {[0, 0.5, 1].map((t, i) => {
              const yMin = Math.min(...skew), yMax = Math.max(...skew);
              const v = lerp(yMin, yMax, t);
              return (
                <text key={i} x={cPad.l - 4} y={cPad.t + chartH - t * chartH + 3} textAnchor="end" className="fill-w5 font-mono" style={{ fontSize: 8 }}>
                  {(v * 100).toFixed(0)}%
                </text>
              );
            })}
          </svg>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border-t border-[var(--brd)] pt-2.5">
          <div className="text-center">
            <div className="text-[9px] text-w5 uppercase tracking-wide">IV Rank</div>
            <div className={cn("text-sm font-mono font-semibold", ivRankColor(ivRank))}>{ivRank}%</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-w5 uppercase tracking-wide">ATM IV</div>
            <div className="text-sm font-mono font-semibold text-w">{(atmIV * 100).toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-w5 uppercase tracking-wide">Skew</div>
            <div className="text-sm font-mono font-semibold text-w">{skewRatio.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
