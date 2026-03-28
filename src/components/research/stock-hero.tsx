"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Plus, Bell, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeBadge } from "@/components/shared/change-badge";
import { formatPrice, formatChange } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface StockHeroProps {
  ticker: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
}

export function StockHero({
  ticker,
  name,
  exchange,
  price,
  change,
  changePercent,
}: StockHeroProps) {
  const [isWatched, setIsWatched] = useState(false);
  const [portfolioState, setPortfolioState] = useState<"idle" | "added">("idle");
  const [alertState, setAlertState] = useState<"idle" | "set">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const handlePortfolio = () => {
    setPortfolioState("added");
    setTimeout(() => setPortfolioState("idle"), 1500);
  };

  const handleAlert = () => {
    setAlertState((prev) => (prev === "idle" ? "set" : "idle"));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/research/${ticker}`);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1500);
    } catch {
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1500);
    }
  };

  return (
    <motion.div
      className="flex items-start justify-between pb-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className="flex items-center gap-3">
        {/* Logo placeholder */}
        <motion.div
          variants={staggerItem}
          className="w-10 h-10 rounded-lg bg-s2 border border-[var(--brd)] flex items-center justify-center text-[14px] font-bold text-w3"
        >
          {ticker.substring(0, 2)}
        </motion.div>

        <div>
          <motion.div variants={staggerItem} className="flex items-center gap-2">
            <h1 className="text-[15px] font-medium text-w tracking-[-0.2px]">
              {name}
            </h1>
            <span className="text-[10px] font-mono text-w5 bg-s2 px-1.5 py-0.5 rounded">
              {exchange}
            </span>
          </motion.div>
          <motion.div variants={staggerItem} className="flex items-center gap-3 mt-1">
            <span className="font-mono text-[28px] font-semibold text-w tracking-[-1px]">
              ${formatPrice(price)}
            </span>
            <span className={`font-mono text-[14px] ${change >= 0 ? "text-g" : "text-r"}`}>
              {formatChange(change)}
            </span>
            <ChangeBadge value={changePercent} />
          </motion.div>
        </div>
      </div>

      {/* Actions */}
      <motion.div variants={staggerItem} className="flex items-center gap-1.5">
        <Button
          size="sm"
          onClick={() => setIsWatched((prev) => !prev)}
          className={isWatched ? "!border-y !text-y" : ""}
        >
          <Star size={12} fill={isWatched ? "currentColor" : "none"} />
          {isWatched ? "Watching" : "Watch"}
        </Button>
        <Button size="sm" onClick={handlePortfolio} disabled={portfolioState === "added"}>
          {portfolioState === "added" ? <Check size={12} /> : <Plus size={12} />}
          {portfolioState === "added" ? "Added" : "Portfolio"}
        </Button>
        <Button
          size="sm"
          onClick={handleAlert}
          className={alertState === "set" ? "!border-a !text-a" : ""}
        >
          <Bell size={12} fill={alertState === "set" ? "currentColor" : "none"} />
          {alertState === "set" ? "Alert Set" : "Alert"}
        </Button>
        <Button size="sm" onClick={handleShare}>
          <Share2 size={12} />
          {shareState === "copied" ? "Copied" : ""}
        </Button>
      </motion.div>
    </motion.div>
  );
}
