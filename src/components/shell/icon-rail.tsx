"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  CandlestickChart,
  Layers,
  Globe,
  Newspaper,
  Filter,
  PieChart,
  Bell,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { useUserStore } from "@/stores/user.store";
import { getVisibleModules } from "@/services/user-progression.service";
import { useMemo, useState, useEffect } from "react";

type NavItem = { id: string; label: string; icon: typeof LayoutDashboard; href: string };
type NavGroup = NavItem[];

const allNavGroups: NavGroup[] = [
  [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" }],
  [
    { id: "research", label: "Research", icon: Search, href: "/research/AAPL" },
    { id: "screener", label: "Screener", icon: Filter, href: "/screener" },
  ],
  [
    { id: "charts", label: "Charts", icon: CandlestickChart, href: "/charts" },
    { id: "options", label: "Options", icon: Layers, href: "/options" },
    { id: "macro", label: "Macro", icon: Globe, href: "/macro" },
  ],
  [
    { id: "portfolio", label: "Portfolio", icon: PieChart, href: "/portfolio" },
    { id: "alpha", label: "Alpha", icon: Zap, href: "/alpha" },
  ],
  [
    { id: "news", label: "News", icon: Newspaper, href: "/news" },
    { id: "alerts", label: "Alerts", icon: Bell, href: "/alerts" },
  ],
];

export function IconRail() {
  const pathname = usePathname();
  const { onboarding, progression, getEffectiveLevel } = useUserStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const visibleModules = useMemo(() => {
    if (!hydrated) return null; // SSR: render all items to match server HTML
    const level = getEffectiveLevel();
    return getVisibleModules(
      level,
      onboarding.interests,
      progression.unlocked_modules
    );
  }, [hydrated, getEffectiveLevel, onboarding.interests, progression.unlocked_modules]);

  // Filter nav groups — show all on SSR to prevent hydration mismatch
  const navGroups = useMemo(() => {
    if (!visibleModules) return allNavGroups;
    return allNavGroups
      .map((group) => group.filter((item) => visibleModules.has(item.id)))
      .filter((group) => group.length > 0);
  }, [visibleModules]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-[54px] bg-bg border-r border-[var(--brd)] flex flex-col items-center py-3 z-40 max-md:hidden">
      {/* Logo */}
      <Link
        href="/"
        className="w-[30px] h-[30px] rounded-lg bg-s2 flex items-center justify-center mb-4"
      >
        <div className="w-4 h-4 bg-w rounded-sm opacity-80" />
      </Link>

      {/* Nav Icons — grouped with dividers */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className="flex flex-col items-center gap-0.5">
            {gi > 0 && (
              <div className="w-4 h-px bg-[var(--brd2)] my-1.5" />
            )}
            {group.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Tooltip key={item.id} content={item.label} side="right">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150",
                      active
                        ? "text-w"
                        : "text-w4 hover:text-w3 hover:bg-s2"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="rail-active"
                        className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-0.5 h-4 bg-w rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom: Settings + AI */}
      <div className="flex flex-col items-center gap-0.5">
        <Tooltip content="Settings" side="right">
          <Link
            href="/settings"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-w4 hover:text-w3 hover:bg-s2 transition-colors"
          >
            <Settings size={18} strokeWidth={1.5} />
          </Link>
        </Tooltip>

        <Tooltip content="Obsidian AI" side="right">
          <Link
            href="/ai"
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
              "bg-[var(--abg)] text-a hover:glow-ai",
              pathname === "/ai"
                ? "border border-a/40 glow-ai glow-ai-border"
                : "border border-[var(--abr)]"
            )}
          >
            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
            >
              <Sparkles size={18} strokeWidth={1.5} />
            </motion.div>
          </Link>
        </Tooltip>
      </div>
    </nav>
  );
}
