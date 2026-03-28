export interface PortfolioHolding {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  weight: number;
  assetType: "STOCK" | "ETF" | "OPTION" | "CRYPTO" | "BOND" | "CASH";
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  ytdReturn: number;
  ytdReturnPercent: number;
  holdings: PortfolioHolding[];
}

export interface PortfolioAnalytics {
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  correlation: number[][];
  sectorAllocation: { sector: string; weight: number }[];
  assetAllocation: { type: string; weight: number }[];
}

export interface DividendProjection {
  ticker: string;
  annualDividend: number;
  yield: number;
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  nextExDate: string;
  projectedAnnualIncome: number;
}
