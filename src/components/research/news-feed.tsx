"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ExternalLink, Loader2 } from "lucide-react";

interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function NewsFeed({ ticker = "AAPL" }: { ticker?: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stock/${encodeURIComponent(ticker)}/news`)
      .then((res) => (res.ok ? res.json() : { articles: [] }))
      .then((data) => {
        setArticles(data.articles || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker]);

  return (
    <Panel>
      <PanelHeader label={`${ticker} News`} />
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={14} className="animate-spin text-w5" />
        </div>
      ) : articles.length === 0 ? (
        <div className="px-3.5 py-4 text-center text-[11px] text-w5">
          No recent news found for {ticker}
        </div>
      ) : (
        <motion.div
          className="divide-y divide-[var(--brd)]"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {articles.slice(0, 8).map((item) => (
            <motion.a
              key={item.id}
              variants={staggerItem}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3.5 py-2.5 hover:bg-s2 transition-colors cursor-pointer group"
            >
              <div className="text-[12px] text-w2 leading-snug line-clamp-2 group-hover:text-w">
                {item.headline}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-w4 font-medium">{item.source}</span>
                <span className="text-[9px] text-w5 font-mono">{timeAgo(item.datetime)}</span>
                <ExternalLink size={9} className="text-w5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.a>
          ))}
        </motion.div>
      )}
    </Panel>
  );
}
