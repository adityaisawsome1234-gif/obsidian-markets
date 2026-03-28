"use client";

import { useQuery } from "@tanstack/react-query";

export interface StockProfile {
  ticker: string;
  // Company profile
  profile: Array<{
    symbol: string;
    companyName: string;
    mktCap: number;
    marketCap: number;
    price: number;
    beta: number;
    volAvg: number;
    lastDiv: number;
    range: string;
    sector: string;
    industry: string;
    exchange: string;
    description: string;
    ceo: string;
    fullTimeEmployees: string;
    ipoDate: string;
  }> | null;
  // Income statements (annual, last 4 years)
  income: Array<{
    date: string;
    calendarYear: string;
    revenue: number;
    costOfRevenue: number;
    grossProfit: number;
    grossProfitRatio: number;
    operatingExpenses: number;
    operatingIncome: number;
    operatingIncomeRatio: number;
    netIncome: number;
    netIncomeRatio: number;
    eps: number;
    epsdiluted: number;
  }> | null;
  // Ratios TTM
  ratios: Array<{
    peRatioTTM: number;
    priceToBookRatioTTM: number;
    priceToSalesRatioTTM: number;
    dividendYieldTTM: number;
    freeCashFlowYieldTTM: number;
    returnOnEquityTTM: number;
    debtEquityRatioTTM: number;
    currentRatioTTM: number;
    priceEarningsToGrowthRatioTTM: number;
    enterpriseValueOverEBITDATTM: number;
  }> | null;
  // Earnings history
  earnings: Array<{
    date: string;
    symbol: string;
    eps: number;
    epsEstimated: number;
    revenue: number;
    revenueEstimated: number;
    fiscalDateEnding: string;
  }> | null;
  // Analyst estimates (from analyst-estimates endpoint)
  estimates: Array<{
    symbol: string;
    date: string;
    estimatedEpsAvg: number;
    estimatedEpsHigh: number;
    estimatedEpsLow: number;
    estimatedRevenueAvg: number;
    estimatedRevenueHigh: number;
    estimatedRevenueLow: number;
    numberAnalystEstimatedEps: number;
    numberAnalystsEstimatedRevenue: number;
  }> | null;
  // Legacy field (some endpoints return this)
  analysts: Array<{
    symbol: string;
    estimatedEpsAvg: number;
    estimatedRevenueAvg: number;
    numberAnalystEstimatedEps: number;
  }> | null;
  // Institutional holders
  holders: Array<{
    holder: string;
    shares: number;
    dateReported: string;
    change: number;
    weightPercent: number;
  }> | null;
  error?: string;
}

async function fetchStockProfile(ticker: string): Promise<StockProfile> {
  const res = await fetch(`/api/stock/${encodeURIComponent(ticker)}/profile`);
  if (!res.ok) throw new Error("Profile fetch failed");
  return res.json();
}

export function useStockProfile(ticker: string) {
  return useQuery<StockProfile>({
    queryKey: ["stock-profile", ticker],
    queryFn: () => fetchStockProfile(ticker),
    staleTime: 60 * 60 * 1000, // 1 hour (fundamentals don't change fast)
    retry: 1,
    enabled: !!ticker,
  });
}
