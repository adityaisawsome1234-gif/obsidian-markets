"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { ChangeBadge } from "@/components/shared/change-badge";
import { SparklineArea } from "@/components/shared/sparkline-area";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useMarketData } from "@/hooks/use-market-data";
import { Plus, X, Search, Loader2 } from "lucide-react";

interface WatchlistEntry {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  sparkline: number[];
}

const DEFAULT_TICKERS = ["AAPL", "NVDA", "TSLA", "META", "AMZN", "MSFT"];
const STORAGE_KEY = "obsidian_watchlist";

function getStoredWatchlist(): string[] {
  if (typeof window === "undefined") return DEFAULT_TICKERS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_TICKERS;
}

function saveWatchlist(tickers: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
}

export function WatchlistGrid() {
  const { marketData } = useMarketData();
  const [userTickers, setUserTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [customEntries, setCustomEntries] = useState<Map<string, WatchlistEntry>>(new Map());
  const [showAdd, setShowAdd] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Load stored watchlist on mount
  useEffect(() => {
    setUserTickers(getStoredWatchlist());
  }, []);

  // Fetch data for custom tickers not in the market API response
  useEffect(() => {
    const marketTickers = new Set(
      (marketData?.watchlist || []).map((w: { ticker: string }) => w.ticker)
    );
    const missing = userTickers.filter((t) => !marketTickers.has(t));
    if (missing.length === 0) return;

    let cancelled = false;
    async function fetchMissing() {
      const results = await Promise.all(
        missing.map(async (ticker) => {
          try {
            const res = await fetch(`/api/stock/${ticker}`, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) return null;
            const d = await res.json();
            return {
              ticker: d.ticker || ticker,
              name: d.name || ticker,
              price: d.price || 0,
              changePercent: d.changePercent || 0,
              sparkline: d.sparkline?.length > 0 ? d.sparkline : [d.price || 0],
            } as WatchlistEntry;
          } catch { return null; }
        })
      );
      if (cancelled) return;
      const newMap = new Map(customEntries);
      for (const entry of results) {
        if (entry) newMap.set(entry.ticker, entry);
      }
      setCustomEntries(newMap);
    }
    fetchMissing();
    return () => { cancelled = true; };
  }, [userTickers, marketData]);

  // Build the display list in user's order
  const marketMap = new Map<string, WatchlistEntry>();
  for (const w of marketData?.watchlist || []) {
    marketMap.set(w.ticker, {
      ticker: w.ticker,
      name: w.name,
      price: w.price,
      changePercent: w.changePercent,
      sparkline: w.sparkline?.length > 0 ? w.sparkline : [w.price],
    });
  }

  const items: WatchlistEntry[] = userTickers
    .map((t) => marketMap.get(t) || customEntries.get(t))
    .filter((e): e is WatchlistEntry => e !== null && e !== undefined);

  const handleAddTicker = useCallback(async () => {
    const ticker = searchVal.trim().toUpperCase();
    if (!ticker || ticker.length > 6 || !/^[A-Z]+$/.test(ticker)) {
      setAddError("Enter a valid ticker symbol");
      return;
    }
    if (userTickers.includes(ticker)) {
      setAddError(`${ticker} is already in your watchlist`);
      return;
    }

    setAdding(true);
    setAddError("");

    try {
      const res = await fetch(`/api/stock/${ticker}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        setAddError(`Could not find ${ticker}`);
        setAdding(false);
        return;
      }
      const d = await res.json();
      const entry: WatchlistEntry = {
        ticker: d.ticker || ticker,
        name: d.name || ticker,
        price: d.price || 0,
        changePercent: d.changePercent || 0,
        sparkline: d.sparkline?.length > 0 ? d.sparkline : [d.price || 0],
      };

      const newTickers = [...userTickers, ticker];
      setUserTickers(newTickers);
      saveWatchlist(newTickers);
      setCustomEntries((prev) => new Map(prev).set(ticker, entry));
      setSearchVal("");
      setShowAdd(false);
    } catch {
      setAddError("Failed to fetch ticker data");
    }
    setAdding(false);
  }, [searchVal, userTickers]);

  const handleRemoveTicker = useCallback((ticker: string) => {
    const newTickers = userTickers.filter((t) => t !== ticker);
    if (newTickers.length === 0) return; // Keep at least one
    setUserTickers(newTickers);
    saveWatchlist(newTickers);
  }, [userTickers]);

  return (
    <Panel glow>
      <PanelHeader
        label="Watchlist"
        actions={
          <button
            onClick={() => { setShowAdd(!showAdd); setAddError(""); setSearchVal(""); }}
            className="flex items-center gap-1 text-[10px] text-w5 hover:text-a transition-colors cursor-pointer"
          >
            {showAdd ? <X size={11} /> : <Plus size={11} />}
            {showAdd ? "Close" : "Add"}
          </button>
        }
      />

      {/* Add ticker input */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-[var(--brd)] space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-s2 border border-[var(--brd)] rounded px-2.5 py-1.5">
                  <Search size={12} className="text-w5 shrink-0" />
                  <input
                    value={searchVal}
                    onChange={(e) => { setSearchVal(e.target.value.toUpperCase()); setAddError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTicker()}
                    placeholder="Ticker symbol (e.g. GOOG)"
                    className="flex-1 bg-transparent text-[12px] text-w font-mono placeholder-w5 outline-none"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleAddTicker}
                  disabled={adding || !searchVal.trim()}
                  className={cn(
                    "px-3 py-1.5 rounded text-[11px] font-medium transition-colors",
                    searchVal.trim()
                      ? "bg-a/20 text-a hover:bg-a/30 cursor-pointer"
                      : "bg-s2 text-w5"
                  )}
                >
                  {adding ? <Loader2 size={12} className="animate-spin" /> : "Add"}
                </button>
              </div>
              {addError && (
                <p className="text-[10px] text-r">{addError}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watchlist grid */}
      <motion.div
        className="grid grid-cols-3 max-md:grid-cols-2"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {items.map((item, i) => {
          const isPositive = item.changePercent >= 0;
          return (
            <motion.div key={item.ticker} variants={staggerItem} className="relative group">
              <Link
                href={`/research/${item.ticker}`}
                className={cn(
                  "relative block px-4 py-3.5 overflow-hidden cursor-pointer hover:bg-s2/50 transition-colors duration-150",
                  i < items.length - (items.length % 3 === 0 ? 3 : items.length % 3) && "border-b border-[var(--brd)]",
                  (i % 3 !== 2) && "border-r border-[var(--brd)]"
                )}
              >
                {/* Sparkline background */}
                <div className="absolute bottom-0 left-0 right-0 opacity-10 hover:opacity-20 transition-opacity duration-250">
                  <SparklineArea
                    data={item.sparkline}
                    width={200}
                    height={32}
                    positive={isPositive}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-w tracking-[-0.2px]">
                      {item.ticker}
                    </span>
                    <ChangeBadge value={item.changePercent} />
                  </div>
                  <div className="text-[10px] text-w4 mt-0.5 truncate">
                    {item.name}
                  </div>
                  <div className="font-mono text-[14px] font-medium text-w tracking-[-0.3px] mt-1">
                    ${formatPrice(item.price)}
                  </div>
                </div>
              </Link>

              {/* Remove button — visible on hover */}
              {userTickers.length > 1 && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveTicker(item.ticker); }}
                  className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-s3/80 border border-[var(--brd)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-r/20 hover:border-r/30"
                >
                  <X size={10} className="text-w5 hover:text-r" />
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </Panel>
  );
}
