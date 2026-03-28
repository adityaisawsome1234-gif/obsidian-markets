"use client";

import { useQuery } from "@tanstack/react-query";
import type { OptionsContract, OptionsFlowItem } from "@/types/options";

export interface OptionsChainResponse {
  ticker: string;
  underlyingPrice: number;
  expirations: string[];
  selectedExpiration: string;
  daysToExpiry: number;
  calls: OptionsContract[];
  puts: OptionsContract[];
  expectedMove: number;
  expectedMovePercent: number;
  ivStats: {
    ivRank: number;
    ivPercentile: number;
    currentIV: number;
    hv30: number;
  };
}

async function fetchOptionsChain(ticker: string, expiration?: string): Promise<OptionsChainResponse> {
  const url = `/api/options/${encodeURIComponent(ticker)}/chain${expiration ? `?expiration=${expiration}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Options chain unavailable");
  return res.json();
}

export function useOptionsChain(ticker: string, expiration?: string) {
  return useQuery({
    queryKey: ["options-chain", ticker, expiration],
    queryFn: () => fetchOptionsChain(ticker, expiration),
    staleTime: 30_000,
    enabled: !!ticker,
  });
}

// Options flow — mock for now, ready for live WebSocket feed
function getMockFlow(): OptionsFlowItem[] {
  const tickers = ["NVDA", "SPY", "AAPL", "TSLA", "PLTR", "META", "AMD", "QQQ"];
  return Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    time: new Date(Date.now() - i * 120000).toISOString(),
    ticker: tickers[Math.floor(Math.random() * tickers.length)],
    expiration: "2025-04-17",
    strike: Math.floor(150 + Math.random() * 100),
    type: Math.random() > 0.45 ? "call" as const : "put" as const,
    side: (["bid", "ask", "mid"] as const)[Math.floor(Math.random() * 3)],
    premium: Math.floor(50000 + Math.random() * 3000000),
    size: Math.floor(100 + Math.random() * 5000),
    openInterest: Math.floor(1000 + Math.random() * 50000),
    impliedVolatility: +(0.2 + Math.random() * 0.3).toFixed(4),
    sentiment: Math.random() > 0.4 ? "bullish" as const : "bearish" as const,
    isUnusual: Math.random() > 0.7,
    isSweep: Math.random() > 0.8,
  }));
}

export function useOptionsFlow() {
  return useQuery({
    queryKey: ["options-flow"],
    queryFn: () => getMockFlow(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
