"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  CandlestickChart,
  PieChart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, href: "/" },
  { id: "research", label: "Research", icon: Search, href: "/research/AAPL" },
  { id: "markets", label: "Markets", icon: CandlestickChart, href: "/charts" },
  { id: "portfolio", label: "Portfolio", icon: PieChart, href: "/portfolio" },
  { id: "ai", label: "AI", icon: Sparkles, href: "/ai" },
];

export function MobileTabs() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[56px] bg-bg border-t border-[var(--brd)] flex items-center justify-around z-40 md:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
              active ? "text-w" : "text-w5",
              tab.id === "ai" && active && "text-a"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} />
            <span className="text-[9px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
