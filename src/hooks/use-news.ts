"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsItem } from "@/types/user";

function getMockNews(): NewsItem[] {
  return [
    { id: "1", title: "NVIDIA Reports Record Data Center Revenue", summary: "Data center revenue hit $18.4B, driven by AI infrastructure demand.", source: "Bloomberg", url: "#", tickers: ["NVDA"], sentiment: "positive", publishedAt: new Date(Date.now() - 720000).toISOString() },
    { id: "2", title: "Fed Officials Signal Patience on Rate Cuts", summary: "Multiple Fed governors want more evidence of cooling inflation.", source: "Reuters", url: "#", tickers: [], sentiment: "negative", publishedAt: new Date(Date.now() - 2040000).toISOString() },
    { id: "3", title: "Apple Vision Pro International Launch", summary: "Stronger-than-expected pre-orders in Asian markets.", source: "CNBC", url: "#", tickers: ["AAPL"], sentiment: "positive", publishedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "4", title: "Tesla Recalls 2.2 Million Vehicles", summary: "Fix will be delivered via OTA software update.", source: "AP News", url: "#", tickers: ["TSLA"], sentiment: "negative", publishedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "5", title: "Microsoft Azure Revenue Growth Accelerates", summary: "Cloud growth rate accelerated for first time in six quarters.", source: "Financial Times", url: "#", tickers: ["MSFT"], sentiment: "positive", publishedAt: new Date(Date.now() - 10800000).toISOString() },
  ];
}

export function useNews(ticker?: string) {
  return useQuery({
    queryKey: ["news", ticker],
    queryFn: () => getMockNews(),
    staleTime: 5 * 60 * 1000,
  });
}
