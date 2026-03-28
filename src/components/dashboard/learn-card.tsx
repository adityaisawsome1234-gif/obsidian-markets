"use client";

import { useState, useRef } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Sparkles, Loader2, BookOpen, RefreshCw } from "lucide-react";
import { useUserStore } from "@/stores/user.store";

const CONCEPTS = [
  { term: "P/E Ratio", prompt: "Explain what the P/E ratio means in simple terms with an analogy. Then explain why it matters for evaluating stocks. Keep it under 100 words." },
  { term: "Market Cap", prompt: "Explain market capitalization in simple terms. What's the difference between small-cap, mid-cap, and large-cap? Use a real-world analogy. Under 100 words." },
  { term: "Dividends", prompt: "Explain what dividends are and why some companies pay them while others don't. Use a simple analogy. Under 100 words." },
  { term: "ETFs vs Stocks", prompt: "Explain the difference between an ETF and an individual stock. Why might a beginner prefer ETFs? Keep it under 100 words with a simple analogy." },
  { term: "Support & Resistance", prompt: "Explain support and resistance levels in stock charts using a simple analogy (like a ball bouncing). Keep it under 100 words." },
  { term: "Volatility", prompt: "Explain what volatility means in the stock market and why it matters. Use a simple analogy. Under 100 words." },
  { term: "Dollar-Cost Averaging", prompt: "Explain dollar-cost averaging and why it's a popular strategy for beginners. Use a simple analogy. Under 100 words." },
];

export function LearnCard() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentConcept, setCurrentConcept] = useState(() =>
    CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)]
  );
  const abortRef = useRef<AbortController | null>(null);
  const { watchlists } = useUserStore();

  const topTicker = watchlists[0]?.tickers[0] || "SPY";

  const handleLearn = async () => {
    setLoading(true);
    setContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    const contextualPrompt = `${currentConcept.prompt} If possible, relate it to ${topTicker} as a real example.`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: contextualPrompt }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setContent("*Unable to load lesson. Try again later.*");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setContent(text);
      }
      setLoading(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setContent("*Failed to load lesson.*");
      }
      setLoading(false);
    }
  };

  const handleNext = () => {
    abortRef.current?.abort();
    setContent("");
    setLoading(false);
    const next = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
    setCurrentConcept(next);
  };

  return (
    <Panel>
      <PanelHeader
        label="Learn"
        badge={<Badge variant="ai">Daily</Badge>}
        actions={
          content ? (
            <button
              onClick={handleNext}
              className="p-1 rounded hover:bg-s2 transition-colors"
            >
              <RefreshCw size={11} className="text-w5" />
            </button>
          ) : undefined
        }
      />
      <div className="p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-a" />
          <span className="text-[13px] font-medium text-w">
            {currentConcept.term}
          </span>
        </div>

        {content ? (
          <div className="text-[12.5px] text-w3 leading-[1.75] [&_strong]:text-w [&_strong]:font-semibold">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <p className="text-[11px] text-w4">
            Learn a key investing concept explained simply, with examples from
            your watchlist.
          </p>
        )}

        {!content && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleLearn}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            {loading ? "Generating..." : "Teach me"}
          </Button>
        )}
      </div>
    </Panel>
  );
}
