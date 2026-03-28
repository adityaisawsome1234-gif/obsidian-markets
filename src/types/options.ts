export interface OptionsContract {
  ticker: string;
  expiration: string;
  strike: number;
  type: "call" | "put";
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
  rho: number;
  inTheMoney: boolean;
}

export interface OptionsChain {
  ticker: string;
  expirations: string[];
  calls: OptionsContract[];
  puts: OptionsContract[];
  underlyingPrice: number;
}

export interface OptionsFlowItem {
  id: string;
  time: string;
  ticker: string;
  expiration: string;
  strike: number;
  type: "call" | "put";
  side: "bid" | "ask" | "mid";
  premium: number;
  size: number;
  openInterest: number;
  impliedVolatility: number;
  sentiment: "bullish" | "bearish" | "neutral";
  isUnusual: boolean;
  isSweep: boolean;
}

export interface IVData {
  ticker: string;
  ivRank: number;
  ivPercentile: number;
  currentIv: number;
  historicalIv30: number;
  historicalIv60: number;
  historicalIv90: number;
}

export interface GEXData {
  strike: number;
  gex: number;
  callGex: number;
  putGex: number;
}

export interface MaxPainData {
  ticker: string;
  expiration: string;
  maxPain: number;
  currentPrice: number;
  strikes: { strike: number; callOI: number; putOI: number; totalPain: number }[];
}
