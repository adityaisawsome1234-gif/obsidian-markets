export interface Quote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  timestamp: number;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketOverview {
  indices: IndexQuote[];
  marketStatus: "pre" | "open" | "after" | "closed";
  lastUpdated: number;
}

export interface MarketMover {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  marketCap: number;
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}
