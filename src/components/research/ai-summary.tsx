"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { fadeIn, scaleIn, springGentle } from "@/lib/animations";
import { useStockProfile } from "@/hooks/use-stock-profile";
import { useUserStore } from "@/stores/user.store";

interface AiSummaryProps {
  ticker: string;
}

export function AiSummary({ ticker }: AiSummaryProps) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [deepDive, setDeepDive] = useState("");
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { data: profile } = useStockProfile(ticker);
  const experienceLevel = useUserStore((s) => s.getEffectiveLevel());

  // Build a data-driven summary from the profile API data
  useEffect(() => {
    if (!profile) return;

    const p = profile.profile?.[0];
    const inc = profile.income?.[0];
    const r = profile.ratios?.[0];

    if (!p && !inc) {
      setSummary(`Limited fundamental data available for **${ticker}**. This may be a smaller-cap or international stock not covered by our data providers. Use the AI Deep Dive tab for a more detailed analysis.`);
      setLoading(false);
      return;
    }

    const parts: string[] = [];

    // Company description
    if (p) {
      parts.push(`**${ticker}** (${p.companyName || ticker}) trades on ${p.exchange || "N/A"} in the ${p.sector || "Unknown"} sector (${p.industry || "N/A"}).`);

      const mktCap = p.marketCap || p.mktCap;
      if (mktCap) {
        const capStr = mktCap >= 1e12 ? `$${(mktCap / 1e12).toFixed(2)}T` : mktCap >= 1e9 ? `$${(mktCap / 1e9).toFixed(1)}B` : `$${(mktCap / 1e6).toFixed(0)}M`;
        parts.push(`Market cap of ${capStr} with a beta of ${p.beta?.toFixed(2) || "N/A"}.`);
      }
    }

    // Financial metrics
    if (inc) {
      const revStr = inc.revenue >= 1e9 ? `$${(inc.revenue / 1e9).toFixed(1)}B` : `$${(inc.revenue / 1e6).toFixed(0)}M`;
      const niStr = inc.netIncome >= 1e9 ? `$${(inc.netIncome / 1e9).toFixed(1)}B` : `$${(inc.netIncome / 1e6).toFixed(0)}M`;
      parts.push(`Latest annual revenue of ${revStr} with net income of ${niStr}.`);

      if (inc.grossProfitRatio) {
        parts.push(`Gross margin: ${(inc.grossProfitRatio * 100).toFixed(1)}%. Net margin: ${(inc.netIncomeRatio * 100).toFixed(1)}%.`);
      }
    }

    // Valuation ratios
    if (r) {
      const metrics: string[] = [];
      if (r.peRatioTTM) metrics.push(`P/E: ${r.peRatioTTM.toFixed(1)}x`);
      if (r.enterpriseValueOverEBITDATTM) metrics.push(`EV/EBITDA: ${r.enterpriseValueOverEBITDATTM.toFixed(1)}x`);
      if (r.dividendYieldTTM) metrics.push(`Div yield: ${(r.dividendYieldTTM * 100).toFixed(2)}%`);
      if (metrics.length > 0) parts.push(`Valuation: ${metrics.join(", ")}.`);
    }

    // 52-week range
    if (p?.range) {
      parts.push(`52-week range: $${p.range}.`);
    }

    setSummary(parts.join(" "));
    setLoading(false);
  }, [profile, ticker]);

  // Generate deep dive using Claude with real-time data context
  const handleGenerate = async () => {
    setGenerating(true);
    setDeepDive("");

    const controller = new AbortController();
    abortRef.current = controller;

    // Fetch live quote to include real-time data in prompt
    let liveContext = "";
    try {
      const quoteRes = await fetch(`/api/stock/${ticker}`, { signal: AbortSignal.timeout(5000) });
      if (quoteRes.ok) {
        const q = await quoteRes.json();
        liveContext = `\n\nLIVE DATA: ${ticker} is currently at $${q.price} (${q.change >= 0 ? "+" : ""}${q.changePercent}% today). Day range: $${q.dayLow}-$${q.dayHigh}. Volume: ${(q.volume / 1e6).toFixed(1)}M. Market cap: $${(q.marketCap / 1e9).toFixed(1)}B.`;
      }
    } catch { /* best effort */ }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Give me a concise 3-paragraph deep dive on ${ticker}. Cover: (1) key financials and what's driving growth or contraction, (2) competitive positioning and moat, (3) risks and catalysts in the next 6 months. Be specific with numbers. Keep it under 200 words total.${liveContext}`,
          }],
          mode: "think",
          experienceLevel,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDeepDive(`*AI service error (${res.status}): ${err.error || "Unable to generate analysis. Check your API key configuration."}*`);
        setGenerating(false);
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
        setDeepDive(text);
      }

      setGenerating(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setDeepDive("*Generation failed. Check your Anthropic API key.*");
      }
      setGenerating(false);
    }
  };

  return (
    <motion.div
      className="bg-s1 border border-[var(--abr)] rounded-[var(--rad)] p-3.5"
      variants={fadeIn}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Sparkles size={13} className="text-a" />
        <span className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
          {ticker} AI Summary
        </span>
        <Badge variant="ai">AI</Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={12} className="animate-spin text-w5" />
          <span className="text-[11px] text-w5">Loading {ticker} data...</span>
        </div>
      ) : (
        <motion.div
          className="text-[13px] text-w3 leading-[1.7] space-y-2"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <MarkdownRenderer content={summary} />

          {deepDive && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="border-t border-[var(--brd)] pt-2 mt-2"
            >
              <MarkdownRenderer content={deepDive} />
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        transition={{ ...springGentle, delay: 0.4 }}
      >
        <Button
          variant="primary"
          size="sm"
          className="mt-3"
          onClick={handleGenerate}
          disabled={generating || (!!deepDive && !generating)}
        >
          {generating ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Sparkles size={11} />
          )}
          {generating ? "Generating..." : deepDive ? "Deep Dive Generated" : "Generate AI Deep Dive"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
