"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface NewsArticle {
  id: number;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  image?: string;
  datetime: number;
  category: string;
  tickers?: string[];
  sentiment?: "positive" | "negative" | "neutral";
}

/** Extract ticker symbols from headline/summary text */
function extractTickers(text: string): string[] {
  const known = new Set(["AAPL", "NVDA", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "TSLA", "AMD", "INTC", "NFLX", "CRM", "ORCL", "AVGO", "ADBE", "QCOM", "TXN", "COST", "PEP", "KO", "JPM", "BAC", "GS", "MS", "V", "MA", "UNH", "JNJ", "PFE", "MRK", "LLY", "ABBV", "XOM", "CVX", "BA", "CAT", "DIS", "NKE", "WMT", "HD", "LOW", "SPY", "QQQ", "IWM", "XLE", "USO"]);
  const matches = text.match(/\b[A-Z]{2,5}\b/g) || [];
  return [...new Set(matches.filter((m) => known.has(m)))].slice(0, 3);
}

/** Simple sentiment from headline keywords */
function guessSentiment(headline: string): "positive" | "negative" | "neutral" {
  const h = headline.toLowerCase();
  const bullish = ["surge", "soar", "record", "beat", "exceed", "rally", "jump", "gain", "rise", "upgrade", "bullish", "growth", "profit", "high", "boost", "strong", "accelerat"];
  const bearish = ["fall", "drop", "slide", "decline", "miss", "cut", "crash", "loss", "warn", "recall", "bearish", "weak", "slow", "downgrade", "layoff", "plunge", "tumbl"];
  const bullCount = bullish.filter((w) => h.includes(w)).length;
  const bearCount = bearish.filter((w) => h.includes(w)).length;
  if (bullCount > bearCount) return "positive";
  if (bearCount > bullCount) return "negative";
  return "neutral";
}

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function sentimentBadge(s: string) {
  if (s === "positive") return <Badge variant="up">Bullish</Badge>;
  if (s === "negative") return <Badge variant="down">Bearish</Badge>;
  return <Badge variant="neutral">Neutral</Badge>;
}

export default function NewsPage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/market", { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        if (!mounted) return;

        const articles: NewsArticle[] = (data.news || []).map((n: NewsArticle) => ({
          ...n,
          tickers: extractTickers(`${n.headline || ""} ${n.summary || ""}`),
          sentiment: guessSentiment(n.headline || ""),
        }));

        setNews(articles);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // Refresh every 2 minutes
    const interval = setInterval(load, 120_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Compute trending tickers from the news
  const trendingMap = new Map<string, { mentions: number; bullish: number; total: number }>();
  for (const article of news) {
    for (const t of article.tickers || []) {
      const existing = trendingMap.get(t) || { mentions: 0, bullish: 0, total: 0 };
      existing.mentions++;
      existing.total++;
      if (article.sentiment === "positive") existing.bullish++;
      trendingMap.set(t, existing);
    }
  }
  const trending = [...trendingMap.entries()]
    .map(([ticker, data]) => ({
      ticker,
      mentions: data.mentions,
      sentiment: data.total > 0 ? (data.bullish / data.total) * 2 - 1 : 0,
    }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
        News & Sentiment
      </h1>

      <div className="grid grid-cols-[1fr_280px] gap-4 max-lg:grid-cols-1">
        {/* News feed */}
        <Panel>
          <PanelHeader label="News Feed" badge={<Badge variant="live">Live</Badge>} />

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 size={14} className="animate-spin text-w5" />
              <span className="text-[11px] text-w5">Loading live news...</span>
            </div>
          ) : error ? (
            <div className="px-3.5 py-6 text-center">
              <p className="text-[12px] text-w4">Could not load news: {error}</p>
              <p className="text-[10px] text-w5 mt-1">Check FINNHUB_API_KEY in .env.local</p>
            </div>
          ) : news.length === 0 ? (
            <div className="px-3.5 py-6 text-center">
              <p className="text-[12px] text-w4">No news available</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--brd)]">
              {news.map((article) => (
                <div
                  key={article.id}
                  onClick={() => {
                    if (article.url) {
                      window.open(article.url, "_blank", "noopener");
                    } else if (article.tickers && article.tickers.length > 0) {
                      router.push(`/research/${article.tickers[0]}`);
                    }
                  }}
                  className="px-3.5 py-3 hover:bg-s2/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-[13px] font-medium text-w leading-snug">
                        {article.headline}
                      </h3>
                      {article.summary && (
                        <p className="text-[12px] text-w3 leading-[1.6] mt-1.5 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-w4">{article.source}</span>
                        <span className="text-[9px] font-mono text-w5">{timeAgo(article.datetime)}</span>
                        {(article.tickers || []).map((t) => (
                          <span
                            key={t}
                            onClick={(e) => { e.stopPropagation(); router.push(`/research/${t}`); }}
                            className="text-[10px] font-semibold text-a bg-[var(--abg)] px-1.5 py-0.5 rounded hover:opacity-80"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 mt-1">
                      {sentimentBadge(article.sentiment || "neutral")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Trending sidebar */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader label="Trending Tickers" />
            {trending.length === 0 ? (
              <div className="px-3.5 py-4 text-[11px] text-w5 text-center">
                {loading ? "Loading..." : "No trending tickers"}
              </div>
            ) : (
              <div className="divide-y divide-[var(--brd)]">
                {trending.map((t, i) => (
                  <div
                    key={t.ticker}
                    onClick={() => router.push(`/research/${t.ticker}`)}
                    className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-s2 transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] font-mono text-w5 w-4">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-w tracking-[-0.2px] flex-1">
                      {t.ticker}
                    </span>
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-w4">
                        {t.mentions} mention{t.mentions !== 1 ? "s" : ""}
                      </div>
                      <div
                        className={cn(
                          "font-mono text-[10px]",
                          t.sentiment >= 0 ? "text-g" : "text-r"
                        )}
                      >
                        {t.sentiment >= 0 ? "+" : ""}{(t.sentiment * 100).toFixed(0)}% sentiment
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader label="Congressional Trades" badge={<Badge variant="warning">STOCK Act</Badge>} />
            <div className="px-3.5 py-4 text-[11px] text-w5 text-center italic">
              Congressional trade data requires a premium data source.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
