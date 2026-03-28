"use client";

import { useState, useEffect } from "react";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { Gift, Copy, Check, Users, Zap } from "lucide-react";

interface ReferralStats {
  code: string;
  link: string;
  totalReferred: number;
  converted: number;
  pending: number;
  monthsEarned: number;
}

export function ReferralWidget() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!stats) return null;

  return (
    <Panel>
      <PanelHeader
        label="Refer & Earn"
        badge={<Badge variant="ai">Free Pro</Badge>}
      />
      <div className="p-3.5 space-y-3">
        {/* Value prop */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--abg)] border border-[var(--abr)] flex items-center justify-center shrink-0">
            <Gift size={14} className="text-a" />
          </div>
          <div>
            <p className="text-[11px] text-w3 leading-[1.6]">
              Share Obsidian Markets with friends. You get{" "}
              <strong className="text-a">1 month free Pro</strong> for each
              friend who upgrades.
            </p>
          </div>
        </div>

        {/* Referral link */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 bg-s2 border border-[var(--brd)] rounded-[var(--rad-sm)] px-3 py-2 text-[10px] font-mono text-w4 truncate">
            {stats.link}
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              "p-2 rounded-[var(--rad-sm)] border transition-colors cursor-pointer",
              copied
                ? "bg-[var(--gbg)] border-g/20 text-g"
                : "bg-s2 border-[var(--brd)] text-w4 hover:text-w2 hover:border-[var(--brd2)]"
            )}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-s2 rounded-[var(--rad-sm)] p-2 text-center">
            <Users size={10} className="text-w5 mx-auto mb-1" />
            <div className="font-mono text-[14px] font-bold text-w">
              {stats.totalReferred}
            </div>
            <div className="text-[8px] text-w5 uppercase tracking-[0.3px]">
              Referred
            </div>
          </div>
          <div className="bg-s2 rounded-[var(--rad-sm)] p-2 text-center">
            <Zap size={10} className="text-g mx-auto mb-1" />
            <div className="font-mono text-[14px] font-bold text-g">
              {stats.converted}
            </div>
            <div className="text-[8px] text-w5 uppercase tracking-[0.3px]">
              Converted
            </div>
          </div>
          <div className="bg-s2 rounded-[var(--rad-sm)] p-2 text-center">
            <Gift size={10} className="text-a mx-auto mb-1" />
            <div className="font-mono text-[14px] font-bold text-a">
              {stats.monthsEarned}
            </div>
            <div className="text-[8px] text-w5 uppercase tracking-[0.3px]">
              Months Earned
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
