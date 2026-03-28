"use client";

import { cn } from "@/lib/cn";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function Tooltip({ content, children, side = "right", className }: TooltipProps) {
  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative group/tooltip">
      {children}
      <div
        className={cn(
          "absolute z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150",
          "bg-s4 text-w2 text-[11px] font-medium px-2.5 py-1.5 rounded-[var(--rad-sm)] border border-[var(--brd2)] shadow-lg whitespace-nowrap",
          sideClasses[side],
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}
