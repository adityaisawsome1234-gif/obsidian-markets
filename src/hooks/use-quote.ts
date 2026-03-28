"use client";

import { useQuery } from "@tanstack/react-query";
import type { Quote } from "@/types/market";

// Mock quote data
function getMockQuote(ticker: string): Quote {
  const quotes: Record<string, Partial<Quote>> = {
    AAPL: { name: "Apple Inc.", price: 189.84, change: 2.34, changePercent: 1.25, volume: 54200000, marketCap: 2.95e12 },
    MSFT: { name: "Microsoft Corporation", price: 417.23, change: -1.28, changePercent: -0.31, volume: 22100000, marketCap: 3.1e12 },
    NVDA: { name: "NVIDIA Corporation", price: 878.37, change: 32.47, changePercent: 3.84, volume: 52400000, marketCap: 2.17e12 },
    TSLA: { name: "Tesla Inc.", price: 178.92, change: -3.91, changePercent: -2.14, volume: 78300000, marketCap: 568e9 },
    GOOGL: { name: "Alphabet Inc.", price: 164.82, change: 3.45, changePercent: 2.14, volume: 28400000, marketCap: 2.04e12 },
    META: { name: "Meta Platforms Inc.", price: 504.71, change: 4.32, changePercent: 0.86, volume: 18900000, marketCap: 1.29e12 },
    AMZN: { name: "Amazon.com Inc.", price: 186.49, change: 2.81, changePercent: 1.53, volume: 42300000, marketCap: 1.94e12 },
  };

  const base = quotes[ticker.toUpperCase()] || {};
  return {
    ticker: ticker.toUpperCase(),
    name: base.name || `${ticker.toUpperCase()} Inc.`,
    price: base.price || 150,
    change: base.change || 1.5,
    changePercent: base.changePercent || 1.01,
    open: (base.price || 150) - 2,
    high: (base.price || 150) + 3,
    low: (base.price || 150) - 4,
    close: base.price || 150,
    previousClose: (base.price || 150) - (base.change || 1.5),
    volume: base.volume || 10000000,
    avgVolume: (base.volume || 10000000) * 0.85,
    marketCap: base.marketCap || 100e9,
    timestamp: Date.now(),
  };
}

export function useQuote(ticker: string) {
  return useQuery({
    queryKey: ["quote", ticker],
    queryFn: () => getMockQuote(ticker),
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}
