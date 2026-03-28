"use client";

import { TickerStrip } from "@/components/dashboard/ticker-strip";
import { DailyEdge } from "@/components/dashboard/daily-edge";
import { EventsList } from "@/components/dashboard/events-list";
import { WatchlistGrid } from "@/components/dashboard/watchlist-grid";
import { OptionsFlow } from "@/components/dashboard/options-flow";
import { PortfolioCard } from "@/components/dashboard/portfolio-card";
import { AiPrompt } from "@/components/dashboard/ai-prompt";

/**
 * Command Center — Dashboard
 *
 * PRD §5.1: Ticker strip (8-cell), Daily Edge, Events list,
 * Watchlist (3-col grid), Options flow panel, Portfolio card,
 * AI prompt with suggested chips.
 */
export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
          {greeting}, Trader
        </h1>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-g live-dot" />
          <span className="text-[10px] font-mono text-w4">Markets Open</span>
          <span className="text-[10px] font-mono text-w5">
            {now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/New_York",
            })}{" "}
            ET
          </span>
        </div>
      </div>

      {/* Ticker Strip */}
      <TickerStrip maxItems={8} />

      {/* Row 1: Daily Edge + Events */}
      <div className="grid grid-cols-[1fr_320px] gap-4 max-lg:grid-cols-1">
        <DailyEdge />
        <EventsList />
      </div>

      {/* Row 2: Watchlist + Options Flow */}
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <WatchlistGrid />
        <OptionsFlow />
      </div>

      {/* Row 3: Portfolio Card */}
      <PortfolioCard />

      {/* Row 4: AI Prompt */}
      <AiPrompt />
    </div>
  );
}
