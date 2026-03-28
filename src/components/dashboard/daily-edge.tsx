"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Newspaper, Radio, X } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useDailyEdge, useDailyEdgeRefresh } from "@/hooks/use-daily-edge";
import { cn } from "@/lib/cn";
import { useUserStore } from "@/stores/user.store";

function formatTime(isoStr?: string) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }) + " ET";
  } catch {
    return "—";
  }
}

function tagVariant(tag: string) {
  const t = tag.toUpperCase();
  if (t === "BULLISH") return "up" as const;
  if (t === "BEARISH") return "down" as const;
  if (t === "CRITICAL" || t === "ALERT") return "warning" as const;
  return "neutral" as const;
}

function sectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("pulse") || t.includes("market")) return <TrendingUp size={12} />;
  if (t.includes("event") || t.includes("news")) return <Newspaper size={12} />;
  if (t.includes("flow") || t.includes("signal")) return <Radio size={12} />;
  return <TrendingUp size={12} />;
}

/** Highlight tickers, percentages, dollar amounts, and key terms */
function RichText({ text }: { text: string }) {
  // Split on patterns we want to highlight
  const parts = text.split(
    /(\b[A-Z]{2,5}\b(?= (?:at|leads|lags|faces|\+|-|\d))|\$[\d,.]+(?:\.\d+)?[TBMK]?|[+-]?\d+\.?\d*%|\b(?:S&P 500|Nasdaq|Dow|VIX|Bitcoin|Gold|10Y Treasury)\b)/g
  );

  return (
    <>
      {parts.map((part, i) => {
        // Percentage — color code green/red
        if (/^[+-]?\d+\.?\d*%$/.test(part)) {
          const isPositive = part.startsWith("+") || (!part.startsWith("-") && parseFloat(part) > 0);
          const isNegative = part.startsWith("-");
          return (
            <span
              key={i}
              className={cn(
                "font-semibold font-mono text-[12px]",
                isPositive && "text-g",
                isNegative && "text-r",
                !isPositive && !isNegative && "text-w"
              )}
            >
              {part}
            </span>
          );
        }
        // Dollar amounts
        if (/^\$[\d,.]+/.test(part)) {
          return <span key={i} className="font-semibold text-w font-mono text-[12px]">{part}</span>;
        }
        // Index names
        if (/^(S&P 500|Nasdaq|Dow|VIX|Bitcoin|Gold|10Y Treasury)$/.test(part)) {
          return <span key={i} className="font-semibold text-w">{part}</span>;
        }
        // Tickers (2-5 uppercase letters)
        if (/^[A-Z]{2,5}$/.test(part)) {
          return <span key={i} className="font-semibold text-a">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/** Parse bullet-point content into structured list */
function BulletList({ content }: { content: string }) {
  const lines = content.split("\n").filter(Boolean);
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        const cleaned = line.replace(/^[•\-]\s*/, "");
        return (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex items-start gap-2 text-[12.5px] text-w3 leading-[1.65]"
          >
            <span className="mt-[7px] w-1 h-1 rounded-full bg-a shrink-0" />
            <RichText text={cleaned} />
          </motion.li>
        );
      })}
    </ul>
  );
}

export function DailyEdge({ simplified: simplifiedProp }: { simplified?: boolean }) {
  const { data, isLoading, isError } = useDailyEdge();
  const refresh = useDailyEdgeRefresh();
  const experienceLevel = useUserStore((s) => s.getEffectiveLevel());
  const simplified = simplifiedProp ?? (experienceLevel === "BEGINNER");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({
    "Market Pulse": true,
    "Key Events & News": true,
    "Flow & Signals": false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const hasBriefing = data?.status === "ok" && data.briefing?.sections?.length > 0;
  const sections = hasBriefing ? data.briefing.sections : null;
  const generatedAt = data?.generated_at;
  const reliability = data?.reliability_score;

  const toggleSection = (title: string) => {
    setSectionsExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleAiAnalyze = async () => {
    if (aiAnalysis && !aiLoading) {
      setAiExpanded(!aiExpanded);
      return;
    }

    setAiLoading(true);
    setAiAnalysis("");
    setAiExpanded(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const briefingText = data?.briefing?.full_text || "Market data unavailable";

    const beginnerPrompt = `Here is today's market briefing data:\n\n${briefingText}\n\nExplain what's happening in the markets today in simple terms. Imagine you're explaining to someone new to investing:\n1. **What's happening** — A simple summary of how the markets are doing today\n2. **Why it matters** — What's driving the moves, explained without jargon\n3. **What to know** — One or two things to keep an eye on\n\nDefine any financial terms in parentheses. Use simple analogies. Keep it under 120 words.`;

    const standardPrompt = `Here is today's market briefing data:\n\n${briefingText}\n\nAnalyze this market data. Provide:\n1. **Market Assessment** — What's the overall market telling us today? Bull or bear case?\n2. **Key Takeaways** — The 3 most important things a trader should know right now\n3. **What to Watch** — Specific levels, events, or setups to monitor for the rest of the session\n\nKeep it concise, punchy, and actionable. Use specific numbers from the data. Under 150 words.`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: simplified ? beginnerPrompt : standardPrompt,
          }],
          mode: "think",
          experienceLevel,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiAnalysis(`*Could not generate analysis: ${err.error || "API error"}*`);
        setAiLoading(false);
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
        setAiAnalysis(text);
      }

      setAiLoading(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setAiAnalysis("*Analysis failed. Check your API key configuration.*");
      }
      setAiLoading(false);
    }
  };

  const handleStopAi = () => {
    abortRef.current?.abort();
    setAiLoading(false);
  };

  return (
    <Panel glow>
      <PanelHeader
        label="Daily Edge"
        badge={<Badge variant="ai">AI</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {reliability != null && reliability < 0.75 && (
              <span className="text-[9px] text-r font-mono">Low reliability</span>
            )}
            <span className="text-[9px] font-mono text-w5">
              {isLoading ? "Loading..." : `Updated ${formatTime(generatedAt)}`}
            </span>
            <button
              onClick={() => refresh.mutate(undefined)}
              disabled={refresh.isPending}
              className="p-1 rounded hover:bg-s2 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={11}
                className={cn("text-w5", refresh.isPending && "animate-spin")}
              />
            </button>
          </div>
        }
      />
      <motion.div
        className="p-3.5 space-y-2.5"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Tags */}
        <motion.div className="flex gap-1.5 flex-wrap" variants={staggerItem}>
          {sections ? (
            sections.map((s) => (
              <Badge key={s.tag} variant={tagVariant(s.tag)}>
                {s.tag}
              </Badge>
            ))
          ) : (
            <>
              <Badge variant="up">Bullish</Badge>
              <Badge variant="warning">Fed Watch</Badge>
              <Badge variant="neutral">Earnings Season</Badge>
            </>
          )}
        </motion.div>

        {/* Briefing Sections */}
        {sections ? (
          sections.map((s, idx) => {
            const isOpen = sectionsExpanded[s.title] !== false;
            const isBullets = s.content.includes("•") || s.content.includes("- ");

            return (
              <motion.div
                key={s.title}
                variants={staggerItem}
                className="border border-[var(--brd)] rounded-[var(--rad-sm)] overflow-hidden bg-s1/50"
              >
                {/* Section header */}
                <button
                  onClick={() => toggleSection(s.title)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-s2/40 transition-colors cursor-pointer"
                >
                  <span className="text-a">{sectionIcon(s.title)}</span>
                  <span className="text-[10px] font-semibold text-w3 uppercase tracking-[0.5px] flex-1 text-left">
                    {s.title}
                  </span>
                  <Badge variant={tagVariant(s.tag)} className="text-[8px]">
                    {s.tag}
                  </Badge>
                  {isOpen ? (
                    <ChevronUp size={11} className="text-w5" />
                  ) : (
                    <ChevronDown size={11} className="text-w5" />
                  )}
                </button>

                {/* Section content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-2.5 pt-0.5">
                        {isBullets ? (
                          <BulletList content={s.content} />
                        ) : (
                          <p className="text-[12.5px] text-w3 leading-[1.75]">
                            <RichText text={s.content} />
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : isError ? (
          <motion.p variants={staggerItem} className="text-w4 italic text-[12px]">
            Unable to load AI briefing. Backend may be offline.
          </motion.p>
        ) : (
          <>
            <motion.p variants={staggerItem} className="text-[13px] text-w3 leading-[1.7]">
              Markets are poised for a higher open as{" "}
              <span className="text-w font-medium">NVDA</span> leads tech futures.
              The <span className="text-w font-medium">S&P 500</span> is testing
              resistance at the 5,900 level.
            </motion.p>
          </>
        )}

        {/* AI Analysis Section */}
        <AnimatePresence>
          {aiExpanded && (aiAnalysis || aiLoading) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="border border-a/20 rounded-[var(--rad-sm)] bg-a/[0.03] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={11} className="text-a" />
                    <span className="text-[10px] font-semibold text-a uppercase tracking-[0.5px]">
                      Obsidian AI Analysis
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {aiLoading && (
                      <button
                        onClick={handleStopAi}
                        className="p-1 rounded hover:bg-s2 transition-colors"
                        title="Stop generating"
                      >
                        <X size={10} className="text-w5" />
                      </button>
                    )}
                    <button
                      onClick={() => setAiExpanded(false)}
                      className="p-1 rounded hover:bg-s2 transition-colors"
                    >
                      <ChevronUp size={11} className="text-w5" />
                    </button>
                  </div>
                </div>

                {aiLoading && !aiAnalysis && (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 size={12} className="animate-spin text-a" />
                    <span className="text-[11px] text-w4">Analyzing market conditions...</span>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="text-[12.5px] text-w3 leading-[1.75] [&_strong]:text-w [&_strong]:font-semibold">
                    <MarkdownRenderer content={aiAnalysis} />
                  </div>
                )}

                {aiLoading && aiAnalysis && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-a/10">
                    <Loader2 size={10} className="animate-spin text-a" />
                    <span className="text-[10px] text-w5">Still analyzing...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <motion.div variants={staggerItem}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAiAnalyze}
            disabled={aiLoading}
            className="gap-1.5"
          >
            {aiLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            {aiLoading
              ? "Analyzing..."
              : aiAnalysis
                ? (aiExpanded ? "Hide AI Analysis" : "Show AI Analysis")
                : "Ask Obsidian AI to analyze"
            }
          </Button>
        </motion.div>
      </motion.div>
    </Panel>
  );
}
