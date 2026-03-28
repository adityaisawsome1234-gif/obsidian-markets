"use client";

import { use, useState, useEffect } from "react";
import { StockHero } from "@/components/research/stock-hero";
import { PriceChart } from "@/components/research/price-chart";
import { MetricsGrid } from "@/components/research/metrics-grid";
import { FinancialsTable } from "@/components/research/financials-table";
import { AiSummary } from "@/components/research/ai-summary";
import { AnalystConsensus } from "@/components/research/analyst-consensus";
import { EarningsGrid } from "@/components/research/earnings-grid";
import { HoldersList } from "@/components/research/holders-list";
import { NewsFeed } from "@/components/research/news-feed";
import { AIDeepDive } from "@/components/research/ai-deep-dive/ai-deep-dive";
import { ThesisTracker } from "@/components/research/thesis/thesis-tracker";
import { Tabs } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "ai", label: "AI Deep Dive" },
  { id: "thesis", label: "Thesis" },
  { id: "financials", label: "Financials" },
  { id: "earnings", label: "Earnings" },
  { id: "ownership", label: "Ownership" },
];

interface StockData {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  sparkline: number[];
  instrumentType: string;
}

export default function ResearchPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const upperTicker = ticker.toUpperCase();

  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/stock/${encodeURIComponent(upperTicker)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Not found (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setStock(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [upperTicker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3">
        <Loader2 size={20} className="animate-spin text-a" />
        <span className="text-w3 text-sm">Loading {upperTicker}...</span>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="text-[15px] font-medium text-w">
          Ticker &quot;{upperTicker}&quot; not found
        </div>
        <p className="text-[12px] text-w4 text-center max-w-md">
          {error || "Could not find this stock. Check the ticker symbol and try again."}
        </p>
        <p className="text-[11px] text-w5 mt-2">
          Tip: Use the search bar (⌘K) to find any stock, ETF, index, or crypto worldwide.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <StockHero
        ticker={stock.ticker}
        name={stock.name}
        exchange={stock.exchange}
        price={stock.price}
        change={stock.change}
        changePercent={stock.changePercent}
      />

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} layoutId="research-tab" />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "ai" ? (
          <motion.div
            key="ai-deep-dive"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <AIDeepDive ticker={upperTicker} />
          </motion.div>
        ) : activeTab === "thesis" ? (
          <motion.div
            key="thesis"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <ThesisTracker ticker={upperTicker} />
          </motion.div>
        ) : activeTab === "financials" ? (
          <motion.div
            key="financials"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-[1fr_340px] gap-5 max-lg:grid-cols-1">
              <FinancialsTable ticker={upperTicker} />
              <div className="space-y-5">
                <AiSummary ticker={upperTicker} />
                <MetricsGrid ticker={upperTicker} />
              </div>
            </div>
          </motion.div>
        ) : activeTab === "earnings" ? (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-[1fr_340px] gap-5 max-lg:grid-cols-1">
              <EarningsGrid ticker={upperTicker} />
              <AnalystConsensus ticker={upperTicker} />
            </div>
          </motion.div>
        ) : activeTab === "ownership" ? (
          <motion.div
            key="ownership"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <HoldersList ticker={upperTicker} />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-[1fr_340px] gap-5 max-lg:grid-cols-1">
              <div className="space-y-5">
                <PriceChart ticker={upperTicker} />
                <MetricsGrid ticker={upperTicker} />
                <FinancialsTable ticker={upperTicker} />
              </div>
              <div className="space-y-5">
                <AiSummary ticker={upperTicker} />
                <AnalystConsensus ticker={upperTicker} />
                <EarningsGrid ticker={upperTicker} />
                <HoldersList ticker={upperTicker} />
                <NewsFeed ticker={upperTicker} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
