"use client";

import { useQuery } from "@tanstack/react-query";
import type { KeyMetrics, IncomeStatement, EarningsResult, AnalystConsensus } from "@/types/financials";

function getMockMetrics(ticker: string): KeyMetrics {
  return {
    marketCap: 2.95e12,
    pe: 30.84,
    forwardPe: 28.12,
    eps: 6.14,
    revenue: 394.3e9,
    grossMargin: 0.462,
    netMargin: 0.263,
    fcfYield: 0.0324,
    dividendYield: 0.0051,
    beta: 1.24,
    high52w: 199.62,
    low52w: 164.08,
    avgVolume: 54200000,
    sharesOutstanding: 15.33e9,
    roe: 0.1719,
    roa: 0.308,
    debtToEquity: 1.79,
    currentRatio: 1.07,
    quickRatio: 0.98,
    pbRatio: 48.9,
    psRatio: 7.48,
    evToEbitda: 24.3,
  };
}

function getMockEarnings(): EarningsResult[] {
  return [
    { date: "2024-01-25", quarter: "Q4 2024", epsEstimate: 2.10, epsActual: 2.18, revenueEstimate: 118.2e9, revenueActual: 119.6e9, surprise: 0.08, surprisePercent: 3.81 },
    { date: "2024-10-31", quarter: "Q3 2024", epsEstimate: 1.39, epsActual: 1.46, revenueEstimate: 93.8e9, revenueActual: 94.9e9, surprise: 0.07, surprisePercent: 5.04 },
    { date: "2024-08-01", quarter: "Q2 2024", epsEstimate: 1.32, epsActual: 1.26, revenueEstimate: 86.3e9, revenueActual: 85.8e9, surprise: -0.06, surprisePercent: -4.55 },
    { date: "2024-05-02", quarter: "Q1 2024", epsEstimate: 1.50, epsActual: 1.53, revenueEstimate: 93.0e9, revenueActual: 94.0e9, surprise: 0.03, surprisePercent: 2.0 },
  ];
}

function getMockConsensus(): AnalystConsensus {
  return {
    strongBuy: 18,
    buy: 12,
    hold: 6,
    sell: 1,
    strongSell: 0,
    averageTarget: 210.5,
    highTarget: 250.0,
    lowTarget: 165.0,
    currentPrice: 189.84,
  };
}

export function useKeyMetrics(ticker: string) {
  return useQuery({
    queryKey: ["metrics", ticker],
    queryFn: () => getMockMetrics(ticker),
    staleTime: 60 * 60 * 1000,
  });
}

export function useEarnings(ticker: string) {
  return useQuery({
    queryKey: ["earnings", ticker],
    queryFn: () => getMockEarnings(),
    staleTime: 60 * 60 * 1000,
  });
}

export function useAnalystConsensus(ticker: string) {
  return useQuery({
    queryKey: ["consensus", ticker],
    queryFn: () => getMockConsensus(),
    staleTime: 60 * 60 * 1000,
  });
}
