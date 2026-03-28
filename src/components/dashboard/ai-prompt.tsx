"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem, pulseBadge } from "@/lib/animations";

const SUGGESTED = [
  "Is NVDA overvalued?",
  "Compare AAPL vs MSFT",
  "What's driving the rally?",
  "Best dividend stocks now",
];

export function AiPrompt() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    const q = query.trim();
    if (q) {
      router.push(`/ai?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/ai");
    }
  };

  return (
    <Panel glow className="border-[var(--abr)]">
      <PanelHeader
        label="Obsidian AI"
        badge={<Badge variant="ai">AI</Badge>}
      />
      <div className="p-3.5 space-y-3">
        {/* Input */}
        <div className="relative">
          <motion.div
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-a opacity-60"
            variants={pulseBadge}
            animate="animate"
          >
            <Sparkles size={14} />
          </motion.div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="Ask anything about the markets..."
            className="w-full bg-s2 border border-[var(--abr)] rounded-[var(--rad-sm)] pl-8 pr-10 py-2 text-[12px] text-w2 placeholder:text-w5 outline-none focus:border-a/40 transition-colors"
          />
          <button
            onClick={handleSubmit}
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer",
              query ? "bg-a2 text-white" : "bg-s3 text-w5"
            )}
          >
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Suggested chips */}
        <motion.div
          className="flex gap-1.5 flex-wrap"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {SUGGESTED.map((s) => (
            <motion.button
              key={s}
              variants={staggerItem}
              onClick={() => setQuery(s)}
              className="text-[10px] text-w4 bg-s2 border border-[var(--brd)] rounded-full px-2.5 py-1 hover:border-[var(--brd2)] hover:text-w3 transition-colors cursor-pointer"
            >
              {s}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </Panel>
  );
}
