"use client";

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { useOptionsChain, type OptionsChainResponse } from "@/hooks/use-options-chain";
import type { OptionsContract } from "@/types/options";

const CALL_COLS = ["Bid", "Ask", "Last", "Vol", "OI", "IV", "Delta"] as const;
const PUT_COLS = ["Delta", "IV", "OI", "Vol", "Last", "Ask", "Bid"] as const;

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtNum(n: number, dec = 2) {
  return n.toFixed(dec);
}

function ivColor(iv: number) {
  const t = Math.min(Math.max((iv - 0.15) / 0.65, 0), 1);
  return t < 0.5
    ? `color-mix(in srgb, #60a5fa ${100 - t * 200}%, #ef4444 ${t * 200}%)`
    : `color-mix(in srgb, #60a5fa ${100 - t * 200}%, #ef4444 ${t * 200}%)`;
}

function ivRankColor(v: number) {
  if (v < 30) return "text-g";
  if (v <= 60) return "text-y";
  return "text-r";
}

function cellVal(c: OptionsContract, col: string) {
  switch (col) {
    case "Bid": return fmtNum(c.bid);
    case "Ask": return fmtNum(c.ask);
    case "Last": return fmtNum(c.last);
    case "Vol": return c.volume.toLocaleString();
    case "OI": return c.openInterest.toLocaleString();
    case "IV": return (c.impliedVolatility * 100).toFixed(1) + "%";
    case "Delta": return fmtNum(c.delta, 3);
    default: return "-";
  }
}

export function ChainView({
  ticker,
  onContractSelect,
}: {
  ticker: string;
  onContractSelect?: (contract: OptionsContract) => void;
}) {
  const [expiration, setExpiration] = useState<string | undefined>();
  const { data, isLoading } = useOptionsChain(ticker, expiration);

  const { strikeMap, atmStrike, maxIV } = useMemo(() => {
    if (!data) return { strikeMap: new Map<number, { call?: OptionsContract; put?: OptionsContract }>(), atmStrike: 0, maxIV: 1 };
    const map = new Map<number, { call?: OptionsContract; put?: OptionsContract }>();
    let peak = 0.01;
    for (const c of data.calls) {
      map.set(c.strike, { ...map.get(c.strike), call: c });
      if (c.impliedVolatility > peak) peak = c.impliedVolatility;
    }
    for (const p of data.puts) {
      map.set(p.strike, { ...map.get(p.strike), put: p });
      if (p.impliedVolatility > peak) peak = p.impliedVolatility;
    }
    const strikes = [...map.keys()].sort((a, b) => a - b);
    const atm = strikes.reduce((best, s) =>
      Math.abs(s - data.underlyingPrice) < Math.abs(best - data.underlyingPrice) ? s : best
    , strikes[0] ?? 0);
    return { strikeMap: map, atmStrike: atm, maxIV: peak };
  }, [data]);

  const sortedStrikes = useMemo(
    () => [...(strikeMap.keys())].sort((a, b) => a - b),
    [strikeMap]
  );

  if (isLoading) {
    return (
      <Panel className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-5 w-5 animate-spin text-w5" />
      </Panel>
    );
  }

  if (!data) return null;

  const { ivStats, expectedMove, expectedMovePercent, expirations, daysToExpiry, underlyingPrice } = data;

  return (
    <Panel className="flex flex-col">
      <PanelHeader label="Options Chain" badge={<Badge variant="live">Live</Badge>} />

      {/* Expiration tabs */}
      <div className="flex overflow-x-auto border-b border-[var(--brd)] scrollbar-none">
        {expirations.map((exp) => {
          const active = exp === (expiration ?? data.selectedExpiration);
          const dt = Math.round((new Date(exp).getTime() - Date.now()) / 86_400_000);
          return (
            <button
              key={exp}
              onClick={() => setExpiration(exp)}
              className={cn(
                "shrink-0 px-3 py-2 text-center transition-colors",
                active ? "bg-s3 text-w" : "text-w5 hover:text-w4"
              )}
            >
              <div className="text-[11px] font-semibold">{fmtDate(exp)}</div>
              <div className="text-[9px] text-w5">{dt}d</div>
            </button>
          );
        })}
      </div>

      {/* IV stats bar */}
      <div className="grid grid-cols-4 border-b border-[var(--brd)]">
        {([
          ["IV Rank", ivStats.ivRank, true],
          ["IV Percentile", ivStats.ivPercentile, true],
          ["Current IV", ivStats.currentIV, false],
          ["HV 30d", ivStats.hv30, false],
        ] as const).map(([label, val, ranked], i) => (
          <div
            key={label}
            className={cn("px-3 py-2", i > 0 && "border-l border-[var(--brd)]")}
          >
            <div className="text-[9px] uppercase tracking-wider text-w5">{label}</div>
            <div
              className={cn(
                "text-[13px] font-mono font-semibold",
                ranked ? ivRankColor(val as number) : "text-w"
              )}
            >
              {ranked ? fmtNum(val as number, 1) : fmtNum(val as number, 1) + "%"}
            </div>
          </div>
        ))}
      </div>

      {/* Expected move */}
      <div className="px-3.5 py-2 border-b border-[var(--brd)] text-[11px] text-w4">
        Expected Move{" "}
        <span className="font-mono font-semibold text-w">
          {"\u00B1"}${fmtNum(expectedMove)} ({"\u00B1"}{fmtNum(expectedMovePercent, 2)}%)
        </span>
        <span className="ml-1 text-w5">by expiry ({daysToExpiry}d)</span>
      </div>

      {/* Chain table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-w5">
              <th colSpan={7} className="px-2 py-1.5 text-center border-b border-[var(--brd)]">Calls</th>
              <th className="px-2 py-1.5 text-center border-b border-[var(--brd)] bg-s2">Strike</th>
              <th colSpan={7} className="px-2 py-1.5 text-center border-b border-[var(--brd)]">Puts</th>
            </tr>
            <tr className="text-[9px] uppercase tracking-wider text-w5 border-b border-[var(--brd)]">
              {CALL_COLS.map((c) => (
                <th key={"c-" + c} className="px-1.5 py-1 text-right font-normal">{c}</th>
              ))}
              <th className="px-2 py-1 text-center font-semibold bg-s2">Price</th>
              {PUT_COLS.map((c) => (
                <th key={"p-" + c} className="px-1.5 py-1 text-left font-normal">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStrikes.map((strike) => {
              const row = strikeMap.get(strike)!;
              const isAtm = strike === atmStrike;
              const callItm = strike < underlyingPrice;
              const putItm = strike > underlyingPrice;
              return (
                <tr
                  key={strike}
                  className={cn(
                    "transition-colors hover:bg-s2/50 cursor-pointer",
                    isAtm && "border-l-2 border-l-[var(--g)]"
                  )}
                  onClick={() => {
                    if (onContractSelect && row.call) onContractSelect(row.call);
                  }}
                >
                  {CALL_COLS.map((col) => {
                    const c = row.call;
                    const isIV = col === "IV";
                    return (
                      <td
                        key={"c-" + col}
                        className={cn(
                          "px-1.5 py-[3px] text-right font-mono text-[11px] text-w3",
                          callItm && "bg-[var(--gbg)]"
                        )}
                        style={isIV && c ? { color: ivColor(c.impliedVolatility) } : undefined}
                      >
                        {c ? cellVal(c, col) : "-"}
                      </td>
                    );
                  })}
                  <td className="px-2 py-[3px] text-center font-mono text-[11px] font-semibold bg-s2 text-w">
                    {fmtNum(strike, strike % 1 === 0 ? 0 : 2)}
                  </td>
                  {PUT_COLS.map((col) => {
                    const p = row.put;
                    const isIV = col === "IV";
                    return (
                      <td
                        key={"p-" + col}
                        className={cn(
                          "px-1.5 py-[3px] text-left font-mono text-[11px] text-w3",
                          putItm && "bg-[var(--rbg)]"
                        )}
                        style={isIV && p ? { color: ivColor(p.impliedVolatility) } : undefined}
                        onClick={(e) => {
                          if (onContractSelect && p) {
                            e.stopPropagation();
                            onContractSelect(p);
                          }
                        }}
                      >
                        {p ? cellVal(p, col) : "-"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
