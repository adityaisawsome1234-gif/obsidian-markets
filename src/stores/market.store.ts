import { create } from "zustand";
import type { Quote, IndexQuote } from "@/types/market";

interface MarketState {
  quotes: Record<string, Quote>;
  indices: IndexQuote[];
  marketStatus: "pre" | "open" | "after" | "closed";
  lastUpdated: number;
  setQuote: (ticker: string, quote: Quote) => void;
  setQuotes: (quotes: Record<string, Quote>) => void;
  setIndices: (indices: IndexQuote[]) => void;
  setMarketStatus: (status: "pre" | "open" | "after" | "closed") => void;
}

export const useMarketStore = create<MarketState>()((set) => ({
  quotes: {},
  indices: [],
  marketStatus: "closed",
  lastUpdated: 0,

  setQuote: (ticker, quote) =>
    set((state) => ({
      quotes: { ...state.quotes, [ticker]: quote },
      lastUpdated: Date.now(),
    })),

  setQuotes: (quotes) =>
    set({ quotes, lastUpdated: Date.now() }),

  setIndices: (indices) =>
    set({ indices, lastUpdated: Date.now() }),

  setMarketStatus: (marketStatus) =>
    set({ marketStatus }),
}));
