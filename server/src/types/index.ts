import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ApiError extends Error {
  statusCode: number;
  code?: string;
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: string;
}

export interface StockProfile {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  ceo: string;
  employees: number;
  headquarters: string;
  website: string;
  exchange: string;
  marketCap: number;
  peRatio: number;
  dividendYield: number;
  beta: number;
  week52High: number;
  week52Low: number;
}

export interface OptionsContract {
  contractSymbol: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface OptionsFlow {
  id: string;
  ticker: string;
  type: 'call' | 'put';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  strike: number;
  expiration: string;
  premium: number;
  volume: number;
  openInterest: number;
  timestamp: string;
}

export interface MarketMover {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface SectorPerformance {
  sector: string;
  changePercent: number;
  weekChange: number;
  monthChange: number;
  ytdChange: number;
}

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
  actual?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  tickers: string[];
  sentiment: number;
  category: string;
}

export interface Alert {
  id: string;
  userId: string;
  type: 'price' | 'volume' | 'news' | 'options_flow' | 'technical';
  ticker: string;
  condition: string;
  value: number;
  enabled: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioHolding {
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
}
