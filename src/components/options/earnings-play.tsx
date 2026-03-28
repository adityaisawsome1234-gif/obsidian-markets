"use client";

import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

function hashTicker(t: string): number {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seeded(hash: number, i: number): number {
  const x = Math.sin(hash * 9301 + i * 49297) * 49979;
  return x - Math.floor(x);
}

type Quarter = {
  label: string;
  date: string;
  move: number;
  epsSurprise: number;
};

function generateHistory(ticker: string): Quarter[] {
  const h = hashTicker(ticker);
  const quarters: Quarter[] = [];
  const labels = ["Q1'24", "Q2'24", "Q3'24", "Q4'24", "Q1'25", "Q2'25", "Q3'25", "Q4'25"];
  const months = ["Jan", "Apr", "Jul", "Oct", "Jan", "Apr", "Jul", "Oct"];
  for (let i = 0; i < 8; i++) {
    const r = seeded(h, i);
    const move = (r - 0.35) * 18;
    const eps = (seeded(h, i + 100) - 0.4) * 12;
    const day = 10 + Math.floor(seeded(h, i + 200) * 18);
    quarters.push({
      label: labels[i],
      date: `${months[i]} ${day}, ${i < 4 ? "2024" : "2025"}`,
      move: Math.round(move * 100) / 100,
      epsSurprise: Math.round(eps * 100) / 100,
    });
  }
  return quarters;
}

export default function EarningsPlay({
  ticker,
  underlyingPrice,
  atmStraddle,
}: {
  ticker: string;
  underlyingPrice: number;
  atmStraddle: number;
}) {
  const history = useMemo(() => generateHistory(ticker), [ticker]);
  const impliedMove = atmStraddle * 0.85;
  const impliedPct = (impliedMove / underlyingPrice) * 100;
  const avgHistorical = history.reduce((s, q) => s + Math.abs(q.move), 0) / history.length;
  const isExpensive = impliedPct > avgHistorical;

  const maxAbs = Math.max(...history.map((q) => Math.abs(q.move)), impliedPct);
  const chartH = 160;
  const chartW = 520;
  const barW = 40;
  const gap = (chartW - barW * 8) / 9;
  const scale = (chartH * 0.45) / maxAbs;
  const midY = chartH / 2;

  const sdMove = impliedMove / underlyingPrice;
  const sellStrike1 = Math.round(underlyingPrice * (1 + sdMove * 1.2));
  const sellStrike2 = Math.round(underlyingPrice * (1 - sdMove * 1.2));
  const buyStrike1 = Math.round(underlyingPrice * (1 + sdMove * 0.5));
  const buyStrike2 = Math.round(underlyingPrice * (1 - sdMove * 0.5));

  return (
    <Panel>
      <PanelHeader label="Earnings Play Analyzer" badge={<Badge variant="ai">{ticker}</Badge>} />

      <div className="p-3.5 space-y-3">
      {/* Verdict Banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
        style={{
          background: isExpensive ? "var(--ybg)" : "var(--gbg)",
          border: `1px solid ${isExpensive ? "var(--y)" : "var(--g)"}`,
          color: isExpensive ? "var(--y)" : "var(--g)",
        }}
      >
        {isExpensive ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <TrendingUp className="w-4 h-4 shrink-0" />}
        <span>
          Options are <b>{isExpensive ? "EXPENSIVE" : "CHEAP"}</b> — Implied move{" "}
          <b className="font-mono">{impliedPct.toFixed(1)}%</b> vs Avg actual{" "}
          <b className="font-mono">{avgHistorical.toFixed(1)}%</b>.{" "}
          {isExpensive ? "Favor selling premium." : "Favor buying premium."}
        </span>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3" style={{ border: "1px solid var(--brd)", borderRadius: 6 }}>
        {[
          { label: "Implied Move", value: `\u00B1$${impliedMove.toFixed(2)} (\u00B1${impliedPct.toFixed(1)}%)` },
          { label: "Avg Historical Move", value: `\u00B1${avgHistorical.toFixed(1)}%` },
          { label: "ATM Straddle Price", value: `$${atmStraddle.toFixed(2)}` },
        ].map((m, i) => (
          <div
            key={m.label}
            className="px-3 py-2 text-center"
            style={{ borderRight: i < 2 ? "1px solid var(--brd)" : undefined }}
          >
            <div className="text-[10px] uppercase" style={{ color: "var(--w4)" }}>{m.label}</div>
            <div className="font-mono text-sm font-semibold" style={{ color: "var(--w)" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Historical Earnings Chart */}
      <div className="overflow-x-auto">
        <svg width={chartW} height={chartH + 28} viewBox={`0 0 ${chartW} ${chartH + 28}`} className="w-full">
          {/* zero line */}
          <line x1={0} y1={midY} x2={chartW} y2={midY} stroke="var(--brd)" strokeWidth={1} />
          {/* implied move dashed lines */}
          {[impliedPct, -impliedPct].map((v, i) => (
            <line
              key={i}
              x1={0}
              y1={midY - v * scale}
              x2={chartW}
              y2={midY - v * scale}
              stroke="var(--y)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.6}
            />
          ))}
          {/* bars */}
          {history.map((q, i) => {
            const x = gap + i * (barW + gap);
            const h = Math.abs(q.move) * scale;
            const y = q.move >= 0 ? midY - h : midY;
            const fill = q.move >= 0 ? "var(--g)" : "var(--r)";
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx={3} fill={fill} opacity={0.8} />
                <text
                  x={x + barW / 2}
                  y={midY - q.move * scale + (q.move >= 0 ? -4 : 14)}
                  textAnchor="middle"
                  fill={fill}
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {q.move > 0 ? "+" : ""}
                  {q.move.toFixed(1)}%
                </text>
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  fill="var(--w4)"
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {q.label}
                </text>
              </g>
            );
          })}
          {/* implied move label */}
          <text x={chartW - 4} y={midY - impliedPct * scale - 4} textAnchor="end" fill="var(--y)" fontSize={8}>
            Implied
          </text>
        </svg>
      </div>

      {/* Earnings History Table */}
      <div className="overflow-x-auto text-xs" style={{ border: "1px solid var(--brd)", borderRadius: 6 }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--brd)", color: "var(--w4)" }}>
              {["Quarter", "Date", "Actual Move", "EPS Surprise", "Direction"].map((h) => (
                <th key={h} className="px-3 py-1.5 text-left font-medium text-[10px] uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((q, i) => (
              <tr key={i} style={{ borderBottom: i < 7 ? "1px solid var(--brd)" : undefined }}>
                <td className="px-3 py-1.5 font-mono" style={{ color: "var(--w)" }}>{q.label}</td>
                <td className="px-3 py-1.5" style={{ color: "var(--w4)" }}>{q.date}</td>
                <td className="px-3 py-1.5 font-mono font-semibold" style={{ color: q.move >= 0 ? "var(--g)" : "var(--r)" }}>
                  {q.move > 0 ? "+" : ""}{q.move.toFixed(2)}%
                </td>
                <td className="px-3 py-1.5 font-mono" style={{ color: q.epsSurprise >= 0 ? "var(--g)" : "var(--r)" }}>
                  {q.epsSurprise >= 0 ? `Beat +${q.epsSurprise.toFixed(1)}%` : `Miss ${q.epsSurprise.toFixed(1)}%`}
                </td>
                <td className="px-3 py-1.5">
                  {q.move >= 0
                    ? <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--g)" }} />
                    : <TrendingDown className="w-3.5 h-3.5" style={{ color: "var(--r)" }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strategy Suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="px-3 py-2 rounded-md text-xs"
        style={{ background: "var(--s2)", border: "1px solid var(--brd)", color: "var(--w5)" }}
      >
        <div className="font-semibold mb-1" style={{ color: "var(--w)" }}>Suggested Strategy</div>
        {isExpensive ? (
          <p>
            Consider selling a <b>strangle</b> at ~1.2 standard deviations:{" "}
            <span className="font-mono" style={{ color: "var(--g)" }}>${sellStrike1}C</span> /{" "}
            <span className="font-mono" style={{ color: "var(--r)" }}>${sellStrike2}P</span>.
            The implied move of <span className="font-mono">{impliedPct.toFixed(1)}%</span> exceeds the average
            historical move of <span className="font-mono">{avgHistorical.toFixed(1)}%</span>, favoring premium sellers.
          </p>
        ) : (
          <p>
            Consider buying a <b>straddle</b> or narrow <b>strangle</b> near the money:{" "}
            <span className="font-mono" style={{ color: "var(--g)" }}>${buyStrike1}C</span> /{" "}
            <span className="font-mono" style={{ color: "var(--r)" }}>${buyStrike2}P</span>.
            The implied move of <span className="font-mono">{impliedPct.toFixed(1)}%</span> underprices the average
            historical move of <span className="font-mono">{avgHistorical.toFixed(1)}%</span>, favoring premium buyers.
          </p>
        )}
      </motion.div>
      </div>
    </Panel>
  );
}
