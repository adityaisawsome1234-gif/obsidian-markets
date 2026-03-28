"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

interface TickerSearchProps {
  onSelect: (ticker: string) => void;
  placeholder?: string;
  className?: string;
}

const MOCK_RESULTS: SearchResult[] = [
  { ticker: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { ticker: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { ticker: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { ticker: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ" },
  { ticker: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { ticker: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
  { ticker: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ" },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  { ticker: "V", name: "Visa Inc.", exchange: "NYSE" },
  { ticker: "UNH", name: "UnitedHealth Group", exchange: "NYSE" },
];

export function TickerSearch({ onSelect, placeholder = "Search ticker...", className }: TickerSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length > 0
    ? MOCK_RESULTS.filter(
        (r) =>
          r.ticker.toLowerCase().includes(query.toLowerCase()) ||
          r.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handleClick = () => setOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className={cn("relative", className)} onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-w5" size={14} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] pl-8 pr-3 py-1.5 text-[12px] text-w2 placeholder:text-w5 outline-none focus:border-[var(--brd3)]"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-s2 border border-[var(--brd2)] rounded-[var(--rad-sm)] shadow-lg z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.ticker}
              onClick={() => {
                onSelect(r.ticker);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-s3 transition-colors cursor-pointer"
            >
              <span className="text-[13px] font-semibold text-w tracking-[-0.2px] min-w-[50px]">
                {r.ticker}
              </span>
              <span className="text-[11px] text-w4 truncate flex-1">{r.name}</span>
              <span className="text-[9px] text-w5 font-mono">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
