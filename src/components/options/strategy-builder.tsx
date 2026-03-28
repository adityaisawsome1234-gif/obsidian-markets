"use client";

import { useState, useMemo, useCallback } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface StrategyLeg {
  id: string;
  type: "call" | "put";
  direction: "long" | "short";
  strike: number;
  premium: number;
  quantity: number;
  expiration: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcLegPnl(leg: StrategyLeg, price: number): number {
  const { type, direction, strike, premium, quantity } = leg;
  let value: number;
  if (type === "call") {
    const intrinsic = Math.max(0, price - strike);
    value = direction === "long" ? intrinsic - premium : premium - intrinsic;
  } else {
    const intrinsic = Math.max(0, strike - price);
    value = direction === "long" ? intrinsic - premium : premium - intrinsic;
  }
  return value * quantity * 100;
}

function calcTotalPnl(legs: StrategyLeg[], price: number): number {
  return legs.reduce((sum, leg) => sum + calcLegPnl(leg, price), 0);
}

function defaultExpiration(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export default function StrategyBuilder({
  ticker,
  underlyingPrice,
  onAddLeg,
}: {
  ticker: string;
  underlyingPrice: number;
  onAddLeg?: () => void;
}) {
  const exp = defaultExpiration();

  const [legs, setLegs] = useState<StrategyLeg[]>([
    {
      id: uid(),
      type: "call",
      direction: "long",
      strike: round2(underlyingPrice * 0.98),
      premium: round2(underlyingPrice * 0.04),
      quantity: 1,
      expiration: exp,
    },
    {
      id: uid(),
      type: "call",
      direction: "short",
      strike: round2(underlyingPrice * 1.02),
      premium: round2(underlyingPrice * 0.02),
      quantity: 1,
      expiration: exp,
    },
  ]);

  const addLeg = useCallback(() => {
    setLegs((prev) => [
      ...prev,
      {
        id: uid(),
        type: "call",
        direction: "long",
        strike: round2(underlyingPrice),
        premium: round2(underlyingPrice * 0.03),
        quantity: 1,
        expiration: exp,
      },
    ]);
    onAddLeg?.();
  }, [underlyingPrice, exp, onAddLeg]);

  const removeLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLeg = useCallback((id: string, patch: Partial<StrategyLeg>) => {
    setLegs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  }, []);

  const adjustQty = useCallback((id: string, delta: number) => {
    setLegs((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l
      )
    );
  }, []);

  /* ----------- strategy analytics ----------- */

  const analysis = useMemo(() => {
    if (legs.length === 0)
      return { maxProfit: 0, maxLoss: 0, breakevens: [] as number[], netDebit: 0, pop: 0 };

    const lo = underlyingPrice * 0.5;
    const hi = underlyingPrice * 1.5;
    const steps = 500;
    const step = (hi - lo) / steps;

    let maxProfit = -Infinity;
    let maxLoss = Infinity;
    const pnlPoints: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const p = lo + i * step;
      const pnl = calcTotalPnl(legs, p);
      pnlPoints.push(pnl);
      if (pnl > maxProfit) maxProfit = pnl;
      if (pnl < maxLoss) maxLoss = pnl;
    }

    // find breakevens (zero crossings)
    const breakevens: number[] = [];
    for (let i = 1; i <= steps; i++) {
      if (
        (pnlPoints[i - 1] <= 0 && pnlPoints[i] >= 0) ||
        (pnlPoints[i - 1] >= 0 && pnlPoints[i] <= 0)
      ) {
        // linear interpolation
        const p1 = lo + (i - 1) * step;
        const p2 = lo + i * step;
        const ratio =
          Math.abs(pnlPoints[i - 1]) /
          (Math.abs(pnlPoints[i - 1]) + Math.abs(pnlPoints[i]) || 1);
        breakevens.push(round2(p1 + ratio * (p2 - p1)));
      }
    }

    // net debit/credit: sum of premiums paid vs received
    const netDebit = legs.reduce((sum, l) => {
      const cost = l.premium * l.quantity * 100;
      return sum + (l.direction === "long" ? -cost : cost);
    }, 0);

    // simple probability of profit estimate: fraction of price range that is profitable
    const profitableSteps = pnlPoints.filter((v) => v > 0).length;
    const pop = round2((profitableSteps / (steps + 1)) * 100);

    return {
      maxProfit: maxProfit === -Infinity ? 0 : round2(maxProfit),
      maxLoss: maxLoss === Infinity ? 0 : round2(maxLoss),
      breakevens,
      netDebit: round2(netDebit),
      pop,
    };
  }, [legs, underlyingPrice]);

  /* ----------- preset strategies ----------- */

  const presets: Record<string, () => StrategyLeg[]> = useMemo(
    () => ({
      "Bull Call": () => [
        {
          id: uid(),
          type: "call",
          direction: "long",
          strike: round2(underlyingPrice * 0.98),
          premium: round2(underlyingPrice * 0.04),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "call",
          direction: "short",
          strike: round2(underlyingPrice * 1.04),
          premium: round2(underlyingPrice * 0.015),
          quantity: 1,
          expiration: exp,
        },
      ],
      "Bear Put": () => [
        {
          id: uid(),
          type: "put",
          direction: "long",
          strike: round2(underlyingPrice * 1.02),
          premium: round2(underlyingPrice * 0.04),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "put",
          direction: "short",
          strike: round2(underlyingPrice * 0.96),
          premium: round2(underlyingPrice * 0.015),
          quantity: 1,
          expiration: exp,
        },
      ],
      "Iron Condor": () => [
        {
          id: uid(),
          type: "put",
          direction: "short",
          strike: round2(underlyingPrice * 0.95),
          premium: round2(underlyingPrice * 0.015),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "put",
          direction: "long",
          strike: round2(underlyingPrice * 0.9),
          premium: round2(underlyingPrice * 0.005),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "call",
          direction: "short",
          strike: round2(underlyingPrice * 1.05),
          premium: round2(underlyingPrice * 0.015),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "call",
          direction: "long",
          strike: round2(underlyingPrice * 1.1),
          premium: round2(underlyingPrice * 0.005),
          quantity: 1,
          expiration: exp,
        },
      ],
      Straddle: () => [
        {
          id: uid(),
          type: "call",
          direction: "long",
          strike: round2(underlyingPrice),
          premium: round2(underlyingPrice * 0.035),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "put",
          direction: "long",
          strike: round2(underlyingPrice),
          premium: round2(underlyingPrice * 0.035),
          quantity: 1,
          expiration: exp,
        },
      ],
      Strangle: () => [
        {
          id: uid(),
          type: "call",
          direction: "long",
          strike: round2(underlyingPrice * 1.05),
          premium: round2(underlyingPrice * 0.02),
          quantity: 1,
          expiration: exp,
        },
        {
          id: uid(),
          type: "put",
          direction: "long",
          strike: round2(underlyingPrice * 0.95),
          premium: round2(underlyingPrice * 0.02),
          quantity: 1,
          expiration: exp,
        },
      ],
    }),
    [underlyingPrice, exp]
  );

  const applyPreset = useCallback(
    (name: string) => {
      const factory = presets[name];
      if (factory) setLegs(factory());
    },
    [presets]
  );

  /* ----------- SVG P&L diagram data ----------- */

  const svgData = useMemo(() => {
    const W = 480;
    const H = 200;
    const PAD_X = 48;
    const PAD_Y = 24;
    const plotW = W - PAD_X * 2;
    const plotH = H - PAD_Y * 2;

    const priceLo = round2(underlyingPrice * 0.8);
    const priceHi = round2(underlyingPrice * 1.2);
    const steps = 200;
    const step = (priceHi - priceLo) / steps;

    const points: { x: number; pnl: number }[] = [];
    let minPnl = Infinity;
    let maxPnl = -Infinity;

    for (let i = 0; i <= steps; i++) {
      const price = priceLo + i * step;
      const pnl = legs.length > 0 ? calcTotalPnl(legs, price) : 0;
      points.push({ x: price, pnl });
      if (pnl < minPnl) minPnl = pnl;
      if (pnl > maxPnl) maxPnl = pnl;
    }

    // ensure some range even if flat
    if (maxPnl === minPnl) {
      maxPnl += 100;
      minPnl -= 100;
    }
    const pnlRange = maxPnl - minPnl;
    const paddedMin = minPnl - pnlRange * 0.1;
    const paddedMax = maxPnl + pnlRange * 0.1;
    const totalRange = paddedMax - paddedMin;

    const toSvgX = (price: number) =>
      PAD_X + ((price - priceLo) / (priceHi - priceLo)) * plotW;
    const toSvgY = (pnl: number) =>
      PAD_Y + plotH - ((pnl - paddedMin) / totalRange) * plotH;

    // build the curve split into green (>=0) and red (<0) segments
    const svgPoints = points.map((p) => ({
      sx: toSvgX(p.x),
      sy: toSvgY(p.pnl),
      pnl: p.pnl,
    }));

    // full path
    const pathD = svgPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`)
      .join(" ");

    // green filled area (above zero)
    const zeroY = toSvgY(0);
    const greenClipPoints = svgPoints.map((p) => ({
      sx: p.sx,
      sy: Math.min(p.sy, zeroY),
    }));
    const greenFillD =
      `M${greenClipPoints[0].sx.toFixed(1)},${zeroY.toFixed(1)} ` +
      greenClipPoints
        .map((p) => `L${p.sx.toFixed(1)},${p.sy.toFixed(1)}`)
        .join(" ") +
      ` L${greenClipPoints[greenClipPoints.length - 1].sx.toFixed(1)},${zeroY.toFixed(1)} Z`;

    // red filled area (below zero)
    const redClipPoints = svgPoints.map((p) => ({
      sx: p.sx,
      sy: Math.max(p.sy, zeroY),
    }));
    const redFillD =
      `M${redClipPoints[0].sx.toFixed(1)},${zeroY.toFixed(1)} ` +
      redClipPoints
        .map((p) => `L${p.sx.toFixed(1)},${p.sy.toFixed(1)}`)
        .join(" ") +
      ` L${redClipPoints[redClipPoints.length - 1].sx.toFixed(1)},${zeroY.toFixed(1)} Z`;

    // current price line
    const curX = toSvgX(underlyingPrice);

    // breakeven markers
    const beMarkers = analysis.breakevens.map((be) => ({
      x: toSvgX(be),
      label: be.toFixed(2),
    }));

    // x-axis labels
    const xLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const price = priceLo + t * (priceHi - priceLo);
      return { x: toSvgX(price), label: price.toFixed(0) };
    });

    // y-axis labels
    const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const pnl = paddedMin + t * totalRange;
      return {
        y: toSvgY(pnl),
        label:
          Math.abs(pnl) >= 1000
            ? `${(pnl / 1000).toFixed(1)}k`
            : pnl.toFixed(0),
      };
    });

    return {
      W,
      H,
      PAD_X,
      PAD_Y,
      plotW,
      plotH,
      pathD,
      greenFillD,
      redFillD,
      zeroY,
      curX,
      beMarkers,
      xLabels,
      yLabels,
    };
  }, [legs, underlyingPrice, analysis.breakevens]);

  /* ----------- render ----------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Panel>
        {/* Header */}
        <PanelHeader
          label="Strategy Builder"
          badge={
            <Badge variant="ai" className="ml-1">
              {ticker}
            </Badge>
          }
          actions={
            <Button variant="primary" size="sm" onClick={addLeg}>
              <Plus size={12} />
              Add Leg
            </Button>
          }
        />

        <div className="p-3.5 flex flex-col gap-3">
          {/* Legs table */}
          <div className="flex flex-col gap-1.5">
            {/* header row */}
            <div className="grid grid-cols-[64px_52px_1fr_1fr_80px_28px] gap-2 px-2 text-[9px] text-w5 uppercase tracking-[0.5px]">
              <span>Type</span>
              <span>Side</span>
              <span>Strike</span>
              <span>Premium</span>
              <span>Qty</span>
              <span />
            </div>

            {legs.map((leg) => (
              <motion.div
                key={leg.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-[64px_52px_1fr_1fr_80px_28px] gap-2 items-center px-2 py-1.5 rounded-[var(--rad-sm)] bg-s2 border border-[var(--brd)]"
              >
                {/* type */}
                <button
                  onClick={() =>
                    updateLeg(leg.id, {
                      type: leg.type === "call" ? "put" : "call",
                    })
                  }
                  className="cursor-pointer"
                >
                  <Badge variant={leg.type === "call" ? "up" : "down"}>
                    {leg.type === "call" ? "CALL" : "PUT"}
                  </Badge>
                </button>

                {/* direction */}
                <button
                  onClick={() =>
                    updateLeg(leg.id, {
                      direction: leg.direction === "long" ? "short" : "long",
                    })
                  }
                  className={cn(
                    "text-[10px] font-semibold cursor-pointer",
                    leg.direction === "long" ? "text-g" : "text-r"
                  )}
                >
                  {leg.direction === "long" ? "BUY" : "SELL"}
                </button>

                {/* strike */}
                <input
                  type="number"
                  value={leg.strike}
                  onChange={(e) =>
                    updateLeg(leg.id, { strike: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-s3 border border-[var(--brd)] rounded-[var(--rad-sm)] px-1.5 py-0.5 text-[11px] font-mono text-w w-full outline-none focus:border-a"
                />

                {/* premium */}
                <input
                  type="number"
                  value={leg.premium}
                  step={0.01}
                  onChange={(e) =>
                    updateLeg(leg.id, {
                      premium: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-s3 border border-[var(--brd)] rounded-[var(--rad-sm)] px-1.5 py-0.5 text-[11px] font-mono text-w w-full outline-none focus:border-a"
                />

                {/* quantity */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustQty(leg.id, -1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-s3 border border-[var(--brd)] text-w3 text-[11px] cursor-pointer hover:bg-s2"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-mono text-w w-6 text-center">
                    {leg.quantity}
                  </span>
                  <button
                    onClick={() => adjustQty(leg.id, 1)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-s3 border border-[var(--brd)] text-w3 text-[11px] cursor-pointer hover:bg-s2"
                  >
                    +
                  </button>
                </div>

                {/* delete */}
                <button
                  onClick={() => removeLeg(leg.id)}
                  className="flex items-center justify-center text-w5 hover:text-r cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}

            {legs.length === 0 && (
              <div className="text-center py-4 text-[10px] text-w5">
                No legs added. Click &quot;Add Leg&quot; or select a preset
                below.
              </div>
            )}
          </div>

          {/* Strategy summary */}
          {legs.length > 0 && (
            <div className="grid grid-cols-5 gap-2 px-2 py-2 rounded-[var(--rad-sm)] bg-s2 border border-[var(--brd)]">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-w5 uppercase tracking-[0.4px]">
                  Max Profit
                </span>
                <span
                  className={cn(
                    "text-[13px] font-mono font-semibold",
                    analysis.maxProfit > 0 ? "text-g" : "text-w3"
                  )}
                >
                  {analysis.maxProfit >= 1e7
                    ? "Unlimited"
                    : `$${analysis.maxProfit.toLocaleString()}`}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-w5 uppercase tracking-[0.4px]">
                  Max Loss
                </span>
                <span
                  className={cn(
                    "text-[13px] font-mono font-semibold",
                    analysis.maxLoss < 0 ? "text-r" : "text-w3"
                  )}
                >
                  ${Math.abs(analysis.maxLoss).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-w5 uppercase tracking-[0.4px]">
                  Breakeven
                </span>
                <span className="text-[11px] font-mono text-w">
                  {analysis.breakevens.length > 0
                    ? analysis.breakevens.map((b) => `$${b}`).join(", ")
                    : "--"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-w5 uppercase tracking-[0.4px]">
                  {analysis.netDebit >= 0 ? "Net Credit" : "Net Debit"}
                </span>
                <span
                  className={cn(
                    "text-[13px] font-mono font-semibold",
                    analysis.netDebit >= 0 ? "text-g" : "text-r"
                  )}
                >
                  ${Math.abs(analysis.netDebit).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-w5 uppercase tracking-[0.4px]">
                  Prob. of Profit
                </span>
                <span className="text-[13px] font-mono font-semibold text-w">
                  {analysis.pop}%
                </span>
              </div>
            </div>
          )}

          {/* P&L Diagram */}
          {legs.length > 0 && (
            <div className="rounded-[var(--rad-sm)] bg-s2 border border-[var(--brd)] p-2 overflow-hidden">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={11} className="text-w5" />
                <span className="text-[9px] text-w5 uppercase tracking-[0.5px] font-semibold">
                  P&L at Expiration
                </span>
              </div>
              <svg
                viewBox={`0 0 ${svgData.W} ${svgData.H}`}
                className="w-full"
                style={{ height: 200 }}
              >
                {/* green fill */}
                <path
                  d={svgData.greenFillD}
                  fill="var(--g)"
                  opacity={0.1}
                />
                {/* red fill */}
                <path d={svgData.redFillD} fill="var(--r)" opacity={0.1} />

                {/* zero line */}
                <line
                  x1={svgData.PAD_X}
                  y1={svgData.zeroY}
                  x2={svgData.PAD_X + svgData.plotW}
                  y2={svgData.zeroY}
                  stroke="var(--w5)"
                  strokeWidth={0.5}
                  strokeDasharray="4 3"
                  opacity={0.5}
                />

                {/* P&L curve: green above zero clip */}
                <defs>
                  <clipPath id="clip-above">
                    <rect
                      x={svgData.PAD_X}
                      y={svgData.PAD_Y}
                      width={svgData.plotW}
                      height={svgData.zeroY - svgData.PAD_Y}
                    />
                  </clipPath>
                  <clipPath id="clip-below">
                    <rect
                      x={svgData.PAD_X}
                      y={svgData.zeroY}
                      width={svgData.plotW}
                      height={svgData.PAD_Y + svgData.plotH - svgData.zeroY}
                    />
                  </clipPath>
                </defs>

                <path
                  d={svgData.pathD}
                  fill="none"
                  stroke="var(--g)"
                  strokeWidth={1.5}
                  clipPath="url(#clip-above)"
                />
                <path
                  d={svgData.pathD}
                  fill="none"
                  stroke="var(--r)"
                  strokeWidth={1.5}
                  clipPath="url(#clip-below)"
                />

                {/* current price vertical line */}
                <line
                  x1={svgData.curX}
                  y1={svgData.PAD_Y}
                  x2={svgData.curX}
                  y2={svgData.PAD_Y + svgData.plotH}
                  stroke="var(--a)"
                  strokeWidth={0.8}
                  strokeDasharray="3 2"
                  opacity={0.7}
                />
                <text
                  x={svgData.curX}
                  y={svgData.PAD_Y - 6}
                  textAnchor="middle"
                  fill="var(--a)"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  ${underlyingPrice.toFixed(0)}
                </text>

                {/* breakeven markers */}
                {svgData.beMarkers.map((be, i) => (
                  <g key={i}>
                    <circle
                      cx={be.x}
                      cy={svgData.zeroY}
                      r={3}
                      fill="var(--w)"
                      opacity={0.8}
                    />
                    <text
                      x={be.x}
                      y={svgData.zeroY + 12}
                      textAnchor="middle"
                      fill="var(--w3)"
                      fontSize={7}
                      fontFamily="monospace"
                    >
                      {be.label}
                    </text>
                  </g>
                ))}

                {/* x-axis labels */}
                {svgData.xLabels.map((lbl, i) => (
                  <text
                    key={i}
                    x={lbl.x}
                    y={svgData.PAD_Y + svgData.plotH + 14}
                    textAnchor="middle"
                    fill="var(--w5)"
                    fontSize={8}
                    fontFamily="monospace"
                  >
                    {lbl.label}
                  </text>
                ))}

                {/* y-axis labels */}
                {svgData.yLabels.map((lbl, i) => (
                  <text
                    key={i}
                    x={svgData.PAD_X - 6}
                    y={lbl.y + 3}
                    textAnchor="end"
                    fill="var(--w5)"
                    fontSize={7}
                    fontFamily="monospace"
                  >
                    {lbl.label}
                  </text>
                ))}
              </svg>
            </div>
          )}

          {/* Preset strategies */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] text-w5 uppercase tracking-[0.5px] mr-1">
              Presets
            </span>
            {Object.keys(presets).map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
