"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
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
  Sparkles,
  Settings,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { motion, AnimatePresence } from "framer-motion";
import { overlayVariants, springBounce } from "@/lib/animations";

const pages = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Charts", href: "/charts", icon: CandlestickChart },
  { name: "Options Intelligence", href: "/options", icon: Layers },
  { name: "Macro Dashboard", href: "/macro", icon: Globe },
  { name: "News & Sentiment", href: "/news", icon: Newspaper },
  { name: "Screener", href: "/screener", icon: Filter },
  { name: "Portfolio", href: "/portfolio", icon: PieChart },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Obsidian AI", href: "/ai", icon: Sparkles },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [search, setSearch] = useState("");
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearch("");
      setLiveResults([]);
    }
  }, [commandPaletteOpen]);

  // Live search as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim() || search.length < 1) {
      setLiveResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data.results || []);
        }
      } catch {
        // Silently fail
      }
      setSearching(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const navigate = (href: string) => {
    router.push(href);
    setCommandPaletteOpen(false);
  };

  // If user types something that looks like a ticker and hits Enter
  const handleDirectSearch = () => {
    const q = search.trim().toUpperCase();
    if (q.length >= 1 && q.length <= 10 && /^[A-Z0-9.^=-]+$/.test(q)) {
      navigate(`/research/${q}`);
    }
  };

  const typeLabels: Record<string, string> = {
    EQUITY: "Stock",
    ETF: "ETF",
    INDEX: "Index",
    CRYPTOCURRENCY: "Crypto",
    FUTURE: "Future",
    MUTUALFUND: "Fund",
  };

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={springBounce}
            className="relative w-full max-w-[520px] bg-s1 border border-[var(--brd2)] rounded-[var(--rad)] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={!search.trim()} loop>
              <div className="flex items-center border-b border-[var(--brd)] px-3">
                <Search size={15} className="text-w5 shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search any stock, ETF, crypto, or page..."
                  className="flex-1 bg-transparent border-none outline-none text-[13px] text-w2 placeholder:text-w5 px-2.5 py-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && liveResults.length === 0 && search.trim()) {
                      e.preventDefault();
                      handleDirectSearch();
                    }
                  }}
                />
                {searching && <Loader2 size={14} className="animate-spin text-w5 mr-2" />}
                <kbd className="text-[9px] text-w5 bg-s3 px-1.5 py-0.5 rounded font-mono">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[380px] overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-6 text-center text-[12px] text-w5">
                  {search.trim()
                    ? `Press Enter to look up "${search.toUpperCase()}"`
                    : "Start typing to search stocks worldwide..."}
                </Command.Empty>

                {/* Live search results */}
                {liveResults.length > 0 && (
                  <Command.Group
                    heading={
                      <span className="text-[10px] font-semibold tracking-[0.6px] text-a/70 uppercase px-2">
                        Stocks & Assets
                      </span>
                    }
                  >
                    {liveResults.map((r) => (
                      <Command.Item
                        key={r.symbol}
                        value={`${r.symbol} ${r.name}`}
                        onSelect={() => navigate(`/research/${r.symbol}`)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--rad-sm)] cursor-pointer data-[selected=true]:bg-s2 transition-colors duration-100"
                      >
                        <TrendingUp size={14} className="text-a/60 shrink-0" />
                        <span className="text-[12px] font-semibold text-w tracking-[-0.2px] min-w-[52px]">
                          {r.symbol}
                        </span>
                        <span className="text-[11px] text-w4 truncate flex-1">{r.name}</span>
                        <span className="text-[9px] text-w5 bg-s3 px-1.5 py-0.5 rounded shrink-0">
                          {typeLabels[r.type] || r.type} · {r.exchange}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Pages — show when not searching */}
                {!search.trim() && (
                  <Command.Group
                    heading={
                      <span className="text-[10px] font-semibold tracking-[0.6px] text-w5 uppercase px-2">
                        Pages
                      </span>
                    }
                  >
                    {pages.map((page) => {
                      const Icon = page.icon;
                      return (
                        <Command.Item
                          key={page.href}
                          value={page.name}
                          onSelect={() => navigate(page.href)}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--rad-sm)] text-[12px] text-w3 cursor-pointer data-[selected=true]:bg-s2 data-[selected=true]:text-w2 transition-colors duration-100"
                        >
                          <Icon size={15} strokeWidth={1.5} className="text-w4" />
                          {page.name}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-[var(--brd)] px-3 py-2 flex items-center justify-between">
                <span className="text-[9px] text-w5">
                  Search any ticker worldwide — US, EU, Asia, crypto
                </span>
                <div className="flex gap-1.5">
                  <kbd className="text-[9px] text-w5 bg-s3 px-1.5 py-0.5 rounded font-mono">↵</kbd>
                  <span className="text-[9px] text-w5">to select</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
