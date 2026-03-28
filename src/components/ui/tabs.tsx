"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  layoutId?: string;
}

export function Tabs({ tabs, activeTab, onChange, className, layoutId = "tab-indicator" }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id);
  const current = activeTab ?? internalActive;

  const handleClick = (tabId: string) => {
    setInternalActive(tabId);
    onChange?.(tabId);
  };

  return (
    <div className={cn("flex border-b border-[var(--brd)]", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab.id)}
          className={cn(
            "relative px-4 py-2.5 text-[12px] font-medium cursor-pointer transition-colors duration-150",
            current === tab.id
              ? "text-w"
              : "text-w4 hover:text-w3"
          )}
        >
          {tab.label}
          {current === tab.id && (
            <motion.div
              layoutId={layoutId}
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-w"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
