"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BriefingSection {
  title: string;
  tag: string;
  content: string;
}

interface DailyEdgeBriefing {
  status: string;
  generated_at: string;
  reliability_score: number;
  source_status: Record<string, string>;
  warnings: Array<{ type: string; [key: string]: unknown }>;
  briefing: {
    full_text: string;
    sections: BriefingSection[];
  };
}

// Generate briefing from local market data API
async function fetchDailyEdge(): Promise<DailyEdgeBriefing> {
  try {
    const res = await fetch("/api/market");
    if (!res.ok) throw new Error("Market API failed");
    const market = await res.json();
    return generateLocalBriefing(market);
  } catch {
    return generateFallbackBriefing();
  }
}

function fmtPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

function fmtPrice(val: number): string {
  if (val >= 10000) return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateLocalBriefing(market: Record<string, unknown>): DailyEdgeBriefing {
  const indices = (market.indices || []) as Array<{ symbol: string; name: string; value: number; change: number; changePercent: number }>;
  const watchlist = (market.watchlist || []) as Array<{ ticker: string; name: string; price: number; changePercent: number }>;
  const sectors = (market.sectors || []) as Array<{ symbol: string; name: string; changePercent: number }>;
  const commodities = (market.commodities || []) as Array<{ symbol: string; name: string; value: number; changePercent: number }>;
  const news = (market.news || []) as Array<{ headline: string; source: string }>;

  const spx = indices.find((i) => i.symbol === "SPX");
  const ndx = indices.find((i) => i.symbol === "NDX");
  const dji = indices.find((i) => i.symbol === "DJI");
  const vix = indices.find((i) => i.symbol === "VIX");
  const tnx = indices.find((i) => i.symbol === "TNX");
  const btc = commodities.find((c) => c.symbol === "BTC");
  const gold = commodities.find((c) => c.symbol === "GC");

  // Determine market sentiment
  const upCount = indices.filter((i) => i.changePercent > 0).length;
  const sentiment = upCount >= 3 ? "BULLISH" : upCount <= 1 ? "BEARISH" : "MIXED";

  // Top movers from watchlist
  const sorted = [...watchlist].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const topMovers = sorted.slice(0, 4);

  // Sector leaders/laggers
  const sectorSorted = [...sectors].sort((a, b) => b.changePercent - a.changePercent);
  const leadingSector = sectorSorted[0];
  const laggingSector = sectorSorted[sectorSorted.length - 1];

  // === MARKET PULSE — structured with line breaks for clarity ===
  const pulseLines: string[] = [];

  // Major indices line
  const indexParts = [
    spx ? `S&P 500 ${spx.value.toLocaleString()} (${fmtPct(spx.changePercent)})` : "",
    ndx ? `Nasdaq ${ndx.value.toLocaleString()} (${fmtPct(ndx.changePercent)})` : "",
    dji ? `Dow ${dji.value.toLocaleString()} (${fmtPct(dji.changePercent)})` : "",
  ].filter(Boolean);
  if (indexParts.length > 0) pulseLines.push(indexParts.join("  ·  "));

  // VIX + Sectors
  const secondLine: string[] = [];
  if (vix) secondLine.push(`VIX at ${vix.value.toFixed(2)} (${fmtPct(vix.changePercent)})`);
  if (leadingSector && laggingSector) {
    secondLine.push(`${leadingSector.name} leads at ${fmtPct(leadingSector.changePercent)}, ${laggingSector.name} lags at ${fmtPct(laggingSector.changePercent)}`);
  }
  if (secondLine.length > 0) pulseLines.push(secondLine.join("  ·  "));

  // Top movers
  if (topMovers.length > 0) {
    pulseLines.push(`Top movers: ${topMovers.map((m) => `${m.ticker} ${fmtPct(m.changePercent)}`).join(", ")}`);
  }

  // Crypto + Commodities
  const assetParts: string[] = [];
  if (btc) assetParts.push(`Bitcoin ${fmtPrice(btc.value)} (${fmtPct(btc.changePercent)})`);
  if (gold) assetParts.push(`Gold ${fmtPrice(gold.value)} (${fmtPct(gold.changePercent)})`);
  if (assetParts.length > 0) pulseLines.push(assetParts.join("  ·  "));

  const marketPulse = pulseLines.join("\n");

  // === KEY EVENTS — bullet list ===
  const keyEvents = news.length > 0
    ? news.slice(0, 5).map((n) => `• ${n.headline} (${n.source})`).join("\n")
    : "• No major events scheduled today\n• Check back during market hours for live updates";

  // === FLOW & SIGNALS ===
  const flowParts: string[] = [];
  if (tnx) flowParts.push(`• 10Y Treasury yield at ${tnx.value.toFixed(3)}% (${fmtPct(tnx.changePercent)})`);
  flowParts.push("• Options implied volatility and unusual flow data updates during market hours");
  flowParts.push("• Signal convergence analysis runs in real-time when connected to options flow providers");
  const flowSignals = flowParts.join("\n");

  const fullText = `${marketPulse}\n\n${keyEvents}\n\n${flowSignals}`;

  return {
    status: "ok",
    generated_at: new Date().toISOString(),
    reliability_score: indices.length > 0 ? 0.85 : 0.4,
    source_status: { yahoo_finance: indices.length > 0 ? "ok" : "error", finnhub: news.length > 0 ? "ok" : "unavailable" },
    warnings: indices.length === 0 ? [{ type: "data_unavailable", message: "Market data sources returned empty. Markets may be closed." }] : [],
    briefing: {
      full_text: fullText,
      sections: [
        { title: "Market Pulse", tag: sentiment, content: marketPulse },
        { title: "Key Events & News", tag: news.length > 3 ? "WATCH" : "SIGNAL", content: keyEvents },
        { title: "Flow & Signals", tag: "SIGNAL", content: flowSignals },
      ],
    },
  };
}

function generateFallbackBriefing(): DailyEdgeBriefing {
  return {
    status: "fallback",
    generated_at: new Date().toISOString(),
    reliability_score: 0,
    source_status: {},
    warnings: [{ type: "offline", message: "All data sources unavailable" }],
    briefing: {
      full_text: "",
      sections: [],
    },
  };
}

export function useDailyEdge() {
  return useQuery<DailyEdgeBriefing>({
    queryKey: ["daily-edge"],
    queryFn: fetchDailyEdge,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });
}

export function useDailyEdgeRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => fetchDailyEdge(),
    onSuccess: (data) => {
      queryClient.setQueryData(["daily-edge"], data);
    },
  });
}
