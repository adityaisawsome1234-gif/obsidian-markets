"use client";

import { useQuery } from "@tanstack/react-query";
import type { PortfolioSummary, PortfolioAnalytics } from "@/types/portfolio";

function getMockPortfolio(): PortfolioSummary {
  return {
    totalValue: 247831.42,
    dayChange: 1842.67,
    dayChangePercent: 0.75,
    totalReturn: 47831.42,
    totalReturnPercent: 23.92,
    ytdReturn: 18432.12,
    ytdReturnPercent: 8.03,
    holdings: [
      { id: "1", ticker: "AAPL", name: "Apple Inc.", shares: 150, avgCost: 145.20, currentPrice: 189.84, marketValue: 28476, totalReturn: 6696, totalReturnPercent: 30.72, dayChange: 351, dayChangePercent: 1.25, weight: 11.5, assetType: "STOCK" },
      { id: "2", ticker: "NVDA", name: "NVIDIA Corp", shares: 45, avgCost: 450.00, currentPrice: 878.37, marketValue: 39526.65, totalReturn: 19276.65, totalReturnPercent: 95.17, dayChange: 1461.15, dayChangePercent: 3.84, weight: 15.9, assetType: "STOCK" },
      { id: "3", ticker: "MSFT", name: "Microsoft", shares: 80, avgCost: 310.50, currentPrice: 417.23, marketValue: 33378.40, totalReturn: 8538.40, totalReturnPercent: 34.37, dayChange: -102.40, dayChangePercent: -0.31, weight: 13.5, assetType: "STOCK" },
    ],
  };
}

function getMockAnalytics(): PortfolioAnalytics {
  return {
    beta: 1.12,
    sharpeRatio: 1.84,
    maxDrawdown: -8.3,
    valueAtRisk: 4230,
    correlation: [],
    sectorAllocation: [
      { sector: "Technology", weight: 48.9 },
      { sector: "Financial", weight: 24.6 },
      { sector: "Healthcare", weight: 6.4 },
      { sector: "Consumer", weight: 15.5 },
    ],
    assetAllocation: [
      { type: "Stocks", weight: 85.4 },
      { type: "ETFs", weight: 10.0 },
      { type: "Cash", weight: 4.6 },
    ],
  };
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getMockPortfolio(),
    staleTime: 30 * 1000,
  });
}

export function usePortfolioAnalytics() {
  return useQuery({
    queryKey: ["portfolio-analytics"],
    queryFn: () => getMockAnalytics(),
    staleTime: 60 * 1000,
  });
}
