"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  Sparkles,
  Loader2,
  Send,
  ArrowDown,
  ArrowUp,
  Minus,
  TrendingDown,
} from "lucide-react";
import type { PortfolioHolding } from "@/types/portfolio";

interface SimResponse {
  query: string;
  scenario: { action: string; ticker: string | null; parameter: number; description: string };
  before: Snapshot;
  after: Snapshot;
  delta: { totalValue: number; totalValuePercent: number; betaChange: number; maxConcentrationChange: number; var95Change: number };
  summary: string;
}

interface Snapshot {
  totalValue: number;
  sectorAllocation: { sector: string; weight: number }[];
  beta: number;
  maxConcentration: { ticker: string; weight: number };
  var95: number;
}

const SUGGESTIONS = [
  "What if NVDA drops 15%?",
  "What if I sell half my AAPL?",
  "What if there's a 2008-style crash?",
  "What if tech drops 20%?",
];

function fmt(n: number, prefix = "$"): string {
  const abs = Math.abs(n);
  const str = abs >= 1000 ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 }) : abs.toFixed(2);
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${prefix}${str}`;
}

function DeltaCell({
  label,
  before,
  after,
  format = "dollar",
}: {
  label: string;
  before: string;
  after: string;
  format?: "dollar" | "percent" | "number";
}) {
  const bNum = parseFloat(before.replace(/[^0-9.-]/g, ""));
  const aNum = parseFloat(after.replace(/[^0-9.-]/g, ""));
  const diff = aNum - bNum;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--brd)] last:border-0">
      <span className="text-[10px] text-w4 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-w5">{before}</span>
        <span className="text-w5">→</span>
        <span
          className={cn(
            "text-[11px] font-mono font-medium",
            isDown ? "text-r" : isUp ? "text-g" : "text-w"
          )}
        >
          {after}
        </span>
        {(isUp || isDown) && (
          isDown ? (
            <ArrowDown size={10} className="text-r" />
          ) : (
            <ArrowUp size={10} className="text-g" />
          )
        )}
      </div>
    </div>
  );
}

export function PortfolioSimulator({
  holdings,
}: {
  holdings: PortfolioHolding[];
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (q?: string) => {
    const text = q || query;
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/portfolio-sim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, holdings }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Simulation failed");
        setLoading(false);
        return;
      }

      const data: SimResponse = await res.json();
      setResult(data);
      setQuery(text);
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  };

  return (
    <Panel glow>
      <PanelHeader
        label="Impact Simulator"
        badge={<Badge variant="ai">AI</Badge>}
      />

      <div className="p-3.5 space-y-3">
        {/* Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="What if NVDA drops 15%?"
            className="flex-1 bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-3 py-2 text-[12px] text-w placeholder-w5 outline-none focus:border-a/40 font-mono"
            disabled={loading}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
          </Button>
        </div>

        {/* Suggestions */}
        {!result && !loading && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  handleSubmit(s);
                }}
                className="text-[10px] text-w4 bg-s2 border border-[var(--brd)] rounded-full px-2.5 py-1 hover:text-w3 hover:border-[var(--brd2)] transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-4 justify-center">
            <Loader2 size={14} className="animate-spin text-a" />
            <span className="text-[11px] text-w4">
              Simulating scenario...
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-[11px] text-r py-2">{error}</p>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Scenario badge */}
              <div className="flex items-center gap-2">
                <TrendingDown size={12} className="text-a" />
                <span className="text-[11px] text-w3">
                  {result.scenario.description}
                </span>
              </div>

              {/* Impact headline */}
              <div
                className={cn(
                  "rounded-[var(--rad-sm)] p-3 border",
                  result.delta.totalValuePercent < 0
                    ? "bg-[var(--rbg)] border-r/20"
                    : "bg-[var(--gbg)] border-g/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-w4 uppercase tracking-wider">
                    Portfolio Impact
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[18px] font-semibold",
                      result.delta.totalValuePercent < 0 ? "text-r" : "text-g"
                    )}
                  >
                    {fmt(result.delta.totalValue)}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "font-mono text-[12px]",
                      result.delta.totalValuePercent < 0 ? "text-r" : "text-g"
                    )}
                  >
                    ({result.delta.totalValuePercent >= 0 ? "+" : ""}
                    {result.delta.totalValuePercent}%)
                  </span>
                </div>
              </div>

              {/* Before/After comparison */}
              <div className="space-y-0">
                <DeltaCell
                  label="Total Value"
                  before={`$${result.before.totalValue.toLocaleString()}`}
                  after={`$${result.after.totalValue.toLocaleString()}`}
                />
                <DeltaCell
                  label="Portfolio Beta"
                  before={result.before.beta.toFixed(2)}
                  after={result.after.beta.toFixed(2)}
                  format="number"
                />
                <DeltaCell
                  label="Max Position"
                  before={`${result.before.maxConcentration.ticker} ${result.before.maxConcentration.weight}%`}
                  after={`${result.after.maxConcentration.ticker} ${result.after.maxConcentration.weight}%`}
                  format="percent"
                />
                <DeltaCell
                  label="VaR (95%)"
                  before={`$${result.before.var95.toLocaleString()}`}
                  after={`$${result.after.var95.toLocaleString()}`}
                />

                {/* Sector shift (top 3) */}
                {result.before.sectorAllocation.slice(0, 3).map((s) => {
                  const afterSector = result.after.sectorAllocation.find(
                    (a) => a.sector === s.sector
                  );
                  return (
                    <DeltaCell
                      key={s.sector}
                      label={s.sector}
                      before={`${s.weight}%`}
                      after={`${afterSector?.weight ?? 0}%`}
                      format="percent"
                    />
                  );
                })}
              </div>

              {/* AI Summary */}
              <div className="border border-a/20 rounded-[var(--rad-sm)] bg-a/[0.03] p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={10} className="text-a" />
                  <span className="text-[9px] font-semibold text-a uppercase tracking-[0.5px]">
                    AI Analysis
                  </span>
                </div>
                <p className="text-[12px] text-w3 leading-[1.7]">
                  {result.summary}
                </p>
              </div>

              {/* Try another */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="gap-1.5"
              >
                <Minus size={11} />
                Try another scenario
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}
