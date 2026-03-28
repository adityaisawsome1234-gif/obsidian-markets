"use client";

import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMarketStore } from "@/stores/market.store";
import type { IndexQuote } from "@/types/market";

interface MarketApiResponse {
  _fetched_at: string;
  _source: string;
  indices: IndexQuote[];
  commodities: { symbol: string; name: string; value: number; change: number; changePercent: number }[];
  watchlist: {
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    sparkline: number[];
  }[];
  sectors: { symbol: string; name: string; price: number; change: number; changePercent: number }[];
  gainers: { symbol: string; name: string; price: number; changePercent: number }[];
  losers: { symbol: string; name: string; price: number; changePercent: number }[];
  news: { id: number; headline: string; source: string; datetime: number; category: string }[];
  macro: {
    fedFundsRate: { value: number; date: string } | null;
    cpi: { value: number; date: string } | null;
    unemployment: { value: number; date: string } | null;
    treasuryYields: { "10Y": number | null; "5Y": number | null; "30Y": number | null };
  };
}

async function fetchMarketData(): Promise<MarketApiResponse> {
  const res = await fetch("/api/market");
  if (!res.ok) throw new Error(`Market API ${res.status}`);
  return res.json();
}

// Fallback mock data if API fails
const MOCK_INDICES: IndexQuote[] = [
  { symbol: "SPX", name: "S&P 500", value: 5892.43, change: 32.18, changePercent: 0.55 },
  { symbol: "NDX", name: "Nasdaq 100", value: 20541.26, change: 187.43, changePercent: 0.92 },
  { symbol: "DJI", name: "Dow Jones", value: 43127.85, change: -45.21, changePercent: -0.10 },
  { symbol: "RUT", name: "Russell 2000", value: 2087.32, change: 14.56, changePercent: 0.70 },
  { symbol: "VIX", name: "VIX", value: 14.32, change: -0.87, changePercent: -5.73 },
  { symbol: "TNX", name: "10Y Treasury", value: 4.284, change: 0.023, changePercent: 0.54 },
  { symbol: "BTC", name: "Bitcoin", value: 97432.18, change: 2341.50, changePercent: 2.46 },
  { symbol: "GC", name: "Gold", value: 2934.50, change: -8.30, changePercent: -0.28 },
];

export function useMarketData() {
  const { indices, setIndices, setMarketStatus } = useMarketStore();

  const query = useQuery<MarketApiResponse>({
    queryKey: ["market-data"],
    queryFn: fetchMarketData,
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 60 * 1000, // Auto-refresh every 60s
    retry: 2,
  });

  const updateStore = useCallback(() => {
    if (query.data) {
      // Merge indices + commodities for the ticker strip
      const allIndices: IndexQuote[] = [
        ...query.data.indices,
        ...query.data.commodities.map((c) => ({
          symbol: c.symbol,
          name: c.name,
          value: c.value,
          change: c.change,
          changePercent: c.changePercent,
        })),
      ];
      setIndices(allIndices);
      setMarketStatus("open");
    } else if (!query.isLoading && indices.length === 0) {
      // Fallback to mock data if API fails
      setIndices(MOCK_INDICES);
      setMarketStatus("open");
    }
  }, [query.data, query.isLoading, indices.length, setIndices, setMarketStatus]);

  useEffect(() => {
    updateStore();
  }, [updateStore]);

  return {
    indices,
    marketData: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
