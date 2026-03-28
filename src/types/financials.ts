export interface CompanyProfile {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  description: string;
  ceo: string;
  employees: number;
  website: string;
  logo: string;
  country: string;
  ipoDate: string;
}

export interface KeyMetrics {
  marketCap: number;
  pe: number | null;
  forwardPe: number | null;
  eps: number | null;
  revenue: number;
  grossMargin: number | null;
  netMargin: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  beta: number | null;
  high52w: number;
  low52w: number;
  avgVolume: number;
  sharesOutstanding: number;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  evToEbitda: number | null;
}

export interface IncomeStatement {
  date: string;
  period: "annual" | "quarterly";
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  operatingMargin: number;
  netIncome: number;
  netMargin: number;
  eps: number;
  epsDiluted: number;
  weightedAvgShares: number;
}

export interface BalanceSheet {
  date: string;
  period: "annual" | "quarterly";
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  totalDebt: number;
  netDebt: number;
  currentAssets: number;
  currentLiabilities: number;
}

export interface CashFlow {
  date: string;
  period: "annual" | "quarterly";
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
  shareRepurchases: number;
}

export interface EarningsResult {
  date: string;
  quarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  surprise: number | null;
  surprisePercent: number | null;
}

export interface AnalystRating {
  firm: string;
  analyst: string;
  rating: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  priceTarget: number;
  date: string;
}

export interface AnalystConsensus {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  averageTarget: number;
  highTarget: number;
  lowTarget: number;
  currentPrice: number;
}

export interface InstitutionalHolder {
  holder: string;
  shares: number;
  value: number;
  percentOfTotal: number;
  changeShares: number;
  dateReported: string;
}

export interface InsiderTransaction {
  name: string;
  title: string;
  transactionType: "Buy" | "Sell" | "Option Exercise";
  shares: number;
  price: number;
  value: number;
  date: string;
}
