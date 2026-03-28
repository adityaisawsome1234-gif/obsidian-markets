"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

const TIMEFRAMES = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "Max"];
const CHART_TYPES = ["Candle", "Line", "Area"];

const TF_PARAMS: Record<string, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "5D": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "YTD": { range: "ytd", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  "5Y": { range: "5y", interval: "1wk" },
  "Max": { range: "max", interval: "1mo" },
};

interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

export function PriceChart({ ticker = "AAPL" }: { ticker?: string }) {
  const [activeTimeframe, setActiveTimeframe] = useState("1Y");
  const [activeType, setActiveType] = useState("Candle");
  const [chartData, setChartData] = useState<OHLC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real chart data from Yahoo Finance
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = TF_PARAMS[activeTimeframe] || TF_PARAMS["1Y"];

    fetch(
      `/api/stock/${encodeURIComponent(ticker)}/chart?range=${params.range}&interval=${params.interval}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Chart data unavailable");
        const json = await res.json();
        const result = json?.chart?.result?.[0];
        if (!result) throw new Error("No chart data");

        const q = result.indicators?.quote?.[0];
        if (!q) throw new Error("No quote data");

        const opens: (number | null)[] = q.open || [];
        const highs: (number | null)[] = q.high || [];
        const lows: (number | null)[] = q.low || [];
        const closes: (number | null)[] = q.close || [];

        const data: OHLC[] = [];
        for (let i = 0; i < closes.length; i++) {
          if (closes[i] != null && opens[i] != null && highs[i] != null && lows[i] != null) {
            data.push({
              open: opens[i]!,
              high: highs[i]!,
              low: lows[i]!,
              close: closes[i]!,
            });
          }
        }

        setChartData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [ticker, activeTimeframe]);

  return (
    <Panel>
      {/* Controls */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--brd)]">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded cursor-pointer transition-colors",
                activeTimeframe === tf ? "bg-s3 text-w" : "text-w4 hover:text-w3 hover:bg-s2"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct}
              onClick={() => setActiveType(ct)}
              className={cn(
                "px-2 py-1 text-[10px] font-medium rounded cursor-pointer transition-colors",
                activeType === ct ? "bg-s3 text-w" : "text-w4 hover:text-w3 hover:bg-s2"
              )}
            >
              {ct}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#101014] rounded-b-[var(--rad)] min-h-[360px]">
        {loading ? (
          <div className="flex items-center justify-center h-[360px] gap-2">
            <Loader2 size={16} className="animate-spin text-w5" />
            <span className="text-[11px] text-w5">Loading {ticker} chart...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[360px]">
            <span className="text-[11px] text-w5">{error}</span>
          </div>
        ) : (
          <SVGChart data={chartData} type={activeType} />
        )}
      </div>
    </Panel>
  );
}

function SVGChart({ data, type }: { data: OHLC[]; type: string }) {
  const W = 800;
  const H = 360;
  const PAD = { top: 10, right: 60, bottom: 24, left: 0 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { minP, maxP } = useMemo(() => {
    const allPrices = data.flatMap((d) => [d.high, d.low]);
    return {
      minP: Math.min(...allPrices),
      maxP: Math.max(...allPrices),
    };
  }, [data]);

  const range = maxP - minP || 1;
  const y = (v: number) => PAD.top + chartH - ((v - minP) / range) * chartH;
  const barW = Math.max(1, Math.min(8, (chartW / data.length) * 0.7));

  const gridLines = 5;
  const gridStep = range / gridLines;

  if (type === "Line" || type === "Area") {
    const points = data.map((d, i) => {
      const x = PAD.left + (i / Math.max(1, data.length - 1)) * chartW;
      return `${x},${y(d.close)}`;
    });
    const linePath = `M${points.join("L")}`;
    const areaPath = `${linePath}L${PAD.left + chartW},${PAD.top + chartH}L${PAD.left},${PAD.top + chartH}Z`;

    const isUp = data.length >= 2 && data[data.length - 1].close >= data[0].close;
    const color = isUp ? "#22c55e" : "#ef4444";

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[360px]" preserveAspectRatio="none">
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const val = minP + gridStep * i;
          const yPos = y(val);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={yPos} x2={W - PAD.right} y2={yPos} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              <text x={W - PAD.right + 6} y={yPos + 3} fill="#55555d" fontSize={9} fontFamily="monospace">
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}
        {type === "Area" && <path d={areaPath} fill={isUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"} />}
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    );
  }

  // Candlestick
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[360px]" preserveAspectRatio="none">
      {Array.from({ length: gridLines + 1 }, (_, i) => {
        const val = minP + gridStep * i;
        const yPos = y(val);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={yPos} x2={W - PAD.right} y2={yPos} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={W - PAD.right + 6} y={yPos + 3} fill="#55555d" fontSize={9} fontFamily="monospace">
              {val.toFixed(2)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = PAD.left + (i / data.length) * chartW + barW / 2;
        const isUp = d.close >= d.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const bodyTop = y(Math.max(d.open, d.close));
        const bodyBot = y(Math.min(d.open, d.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        return (
          <g key={i}>
            <line x1={x} y1={y(d.high)} x2={x} y2={y(d.low)} stroke={color} strokeWidth={0.8} />
            <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} fill={color} rx={0.5} />
          </g>
        );
      })}
    </svg>
  );
}
