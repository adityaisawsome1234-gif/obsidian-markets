"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChangeBadge } from "@/components/shared/change-badge";
import { Tabs } from "@/components/ui/tabs";
import { Filter, Save, Play, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMarketCap, formatVolume } from "@/lib/format";

const TABS = [
  { id: "stocks", label: "Stocks" },
  { id: "options", label: "Options" },
  { id: "etfs", label: "ETFs" },
];

const PRESETS = [
  "Value Picks",
  "Momentum Leaders",
  "High Short Interest",
  "Dividend Aristocrats",
  "Earnings This Week",
  "High IV Options",
];

interface ScreenerResult {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  pe: number | null;
  volume: number;
  sector: string;
}

const MOCK_RESULTS: ScreenerResult[] = [
  { ticker: "NVDA", name: "NVIDIA Corp", price: 878.37, changePercent: 3.84, marketCap: 2.17e12, pe: 72.3, volume: 52400000, sector: "Technology" },
  { ticker: "META", name: "Meta Platforms", price: 504.71, changePercent: 0.86, marketCap: 1.29e12, pe: 34.2, volume: 18900000, sector: "Technology" },
  { ticker: "AMZN", name: "Amazon.com", price: 186.49, changePercent: 1.53, marketCap: 1.94e12, pe: 62.8, volume: 42300000, sector: "Consumer" },
  { ticker: "LLY", name: "Eli Lilly", price: 782.14, changePercent: 2.12, marketCap: 743e9, pe: 126.4, volume: 3800000, sector: "Healthcare" },
  { ticker: "AVGO", name: "Broadcom", price: 1342.56, changePercent: 1.78, marketCap: 624e9, pe: 48.9, volume: 5200000, sector: "Technology" },
  { ticker: "JPM", name: "JPMorgan Chase", price: 198.42, changePercent: 0.57, marketCap: 572e9, pe: 12.1, volume: 8100000, sector: "Finance" },
  { ticker: "XOM", name: "Exxon Mobil", price: 104.23, changePercent: -0.84, marketCap: 430e9, pe: 11.2, volume: 14300000, sector: "Energy" },
  { ticker: "COST", name: "Costco", price: 724.89, changePercent: 0.32, marketCap: 322e9, pe: 48.6, volume: 2100000, sector: "Consumer" },
];

const DEFAULT_FILTERS = ["Market Cap > $100B", "P/E < 50", "Volume > 5M"];

type SortKey = "ticker" | "price" | "changePercent" | "marketCap" | "pe" | "volume";
type SortDir = "asc" | "desc";

export default function ScreenerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("stocks");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [runState, setRunState] = useState<"idle" | "running">("idle");

  const removeFilter = (filter: string) => {
    setFilters((prev) => prev.filter((f) => f !== filter));
  };

  const clearAllFilters = () => {
    setFilters([]);
  };

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  const sortedResults = useMemo(() => {
    const data = [...MOCK_RESULTS];
    data.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortKey) {
        case "ticker": aVal = a.ticker; bVal = b.ticker; break;
        case "price": aVal = a.price; bVal = b.price; break;
        case "changePercent": aVal = a.changePercent; bVal = b.changePercent; break;
        case "marketCap": aVal = a.marketCap; bVal = b.marketCap; break;
        case "pe": aVal = a.pe ?? -1; bVal = b.pe ?? -1; break;
        case "volume": aVal = a.volume; bVal = b.volume; break;
        default: return 0;
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return data;
  }, [sortKey, sortDir]);

  const handleSave = () => {
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1500);
  };

  const handleRun = () => {
    setRunState("running");
    setTimeout(() => setRunState("idle"), 1000);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={9} className="text-w5 ml-0.5" />;
    return sortDir === "asc"
      ? <ArrowUp size={9} className="text-a ml-0.5" />
      : <ArrowDown size={9} className="text-a ml-0.5" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          Screener
        </h1>
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={handleSave} disabled={saveState === "saved"}>
            {saveState === "saved" ? <Check size={11} /> : <Save size={11} />}
            {saveState === "saved" ? "Saved" : "Save Screen"}
          </Button>
          <Button variant="primary" size="sm" onClick={handleRun} disabled={runState === "running"}>
            <Play size={11} />
            {runState === "running" ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Presets */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setActivePreset(activePreset === preset ? null : preset)}
            className={cn(
              "text-[10px] font-medium px-2.5 py-1 rounded-full border cursor-pointer transition-colors",
              activePreset === preset
                ? "bg-s3 text-w border-[var(--brd3)]"
                : "text-w4 border-[var(--brd)] hover:border-[var(--brd2)] hover:text-w3"
            )}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Panel>
        <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-[var(--brd)]">
          <Filter size={13} className="text-w4" />
          <span className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
            Active Filters
          </span>
          <Badge variant="neutral">{filters.length}</Badge>
          <div className="flex-1" />
          <button onClick={clearAllFilters} className="text-[10px] text-w4 hover:text-w3 cursor-pointer">
            Clear All
          </button>
        </div>
        <div className="px-3.5 py-2 flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <span
              key={filter}
              className="inline-flex items-center gap-1 text-[10px] text-w3 bg-s2 px-2 py-1 rounded"
            >
              {filter}
              <button onClick={() => removeFilter(filter)} className="text-w5 hover:text-w3 cursor-pointer">&times;</button>
            </span>
          ))}
          {filters.length === 0 && (
            <span className="text-[10px] text-w5">No active filters</span>
          )}
        </div>
      </Panel>

      {/* Results */}
      <Panel>
        <PanelHeader
          label="Results"
          badge={
            <span className="text-[10px] font-mono text-w4">
              {sortedResults.length} matches
            </span>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--brd)] text-[10px] font-mono text-w5">
                <th className="px-3.5 py-2 cursor-pointer hover:text-w3 select-none" onClick={() => handleSort("ticker")}>
                  <span className="inline-flex items-center">Ticker<SortIcon column="ticker" /></span>
                </th>
                <th className="px-3.5 py-2">Name</th>
                <th className="px-3.5 py-2 text-right cursor-pointer hover:text-w3 select-none" onClick={() => handleSort("price")}>
                  <span className="inline-flex items-center">Price<SortIcon column="price" /></span>
                </th>
                <th className="px-3.5 py-2 text-right cursor-pointer hover:text-w3 select-none" onClick={() => handleSort("changePercent")}>
                  <span className="inline-flex items-center">Change<SortIcon column="changePercent" /></span>
                </th>
                <th className="px-3.5 py-2 text-right cursor-pointer hover:text-w3 select-none" onClick={() => handleSort("marketCap")}>
                  <span className="inline-flex items-center">Mkt Cap<SortIcon column="marketCap" /></span>
                </th>
                <th className="px-3.5 py-2 text-right cursor-pointer hover:text-w3 select-none" onClick={() => handleSort("pe")}>
                  <span className="inline-flex items-center">P/E<SortIcon column="pe" /></span>
                </th>
                <th className="px-3.5 py-2 text-right cursor-pointer hover:text-w3 select-none" onClick={() => handleSort("volume")}>
                  <span className="inline-flex items-center">Volume<SortIcon column="volume" /></span>
                </th>
                <th className="px-3.5 py-2">Sector</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((r) => (
                <tr
                  key={r.ticker}
                  onClick={() => router.push(`/research/${r.ticker}`)}
                  className="border-b border-[var(--brd)] last:border-0 hover:bg-s2/50 transition-colors cursor-pointer"
                >
                  <td className="px-3.5 py-2 text-[13px] font-semibold text-w tracking-[-0.2px]">
                    {r.ticker}
                  </td>
                  <td className="px-3.5 py-2 text-[12px] text-w3 truncate max-w-[150px]">
                    {r.name}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[12px] text-w text-right">
                    ${r.price.toFixed(2)}
                  </td>
                  <td className="px-3.5 py-2 text-right">
                    <ChangeBadge value={r.changePercent} />
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[12px] text-w2 text-right">
                    {formatMarketCap(r.marketCap)}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[12px] text-w3 text-right">
                    {r.pe ? r.pe.toFixed(1) : "—"}
                  </td>
                  <td className="px-3.5 py-2 font-mono text-[12px] text-w3 text-right">
                    {formatVolume(r.volume)}
                  </td>
                  <td className="px-3.5 py-2 text-[11px] text-w4">
                    {r.sector}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
