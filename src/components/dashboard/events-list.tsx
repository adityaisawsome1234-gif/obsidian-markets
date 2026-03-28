"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Panel } from "@/components/ui/panel";
import { PanelHeader } from "@/components/ui/panel-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Loader2 } from "lucide-react";

interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  category: "earnings" | "macro" | "fed";
  subtitle?: string;
  date?: string;
  clickTicker?: string;
}

const pipeColors: Record<string, string> = {
  earnings: "bg-a",
  macro: "bg-blue",
  fed: "bg-y",
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatRevenue(val: number | null): string {
  if (val == null) return "";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toFixed(0)}`;
}

export function EventsList() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/calendar", { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (!mounted) return;

        const built: CalendarEvent[] = [];

        // Earnings
        const earnings = data.earnings || [];
        for (const e of earnings.slice(0, 8)) {
          const timeLabel = e.hour === "bmo" ? "Pre-mkt" : e.hour === "amc" ? "After-mkt" : "";
          const parts: string[] = [];
          if (e.epsEstimate != null) parts.push(`EPS Est: $${e.epsEstimate.toFixed(2)}`);
          if (e.revenueEstimate != null) parts.push(`Rev Est: ${formatRevenue(e.revenueEstimate)}`);

          built.push({
            id: `earn-${e.symbol}-${e.date}`,
            time: timeLabel,
            title: `${e.symbol} Earnings`,
            category: "earnings",
            subtitle: parts.length > 0 ? parts.join(" · ") : undefined,
            date: e.date,
            clickTicker: e.symbol,
          });
        }

        // Economic events
        const economic = data.economic || [];
        for (const e of economic.slice(0, 5)) {
          const parts: string[] = [];
          if (e.estimate) parts.push(`Est: ${e.estimate}`);
          if (e.prior) parts.push(`Prior: ${e.prior}`);

          built.push({
            id: `econ-${e.name}-${e.date}`,
            time: e.time || "",
            title: e.name.length > 30 ? e.name.slice(0, 30) + "…" : e.name,
            category: e.name.toLowerCase().includes("fed") || e.name.toLowerCase().includes("fomc") ? "fed" : "macro",
            subtitle: parts.length > 0 ? parts.join(" · ") : undefined,
            date: e.date,
          });
        }

        // Sort by date
        built.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        setEvents(built);
      } catch {
        setEvents([]);
      }
      if (mounted) setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Group events by date
  const grouped = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.date || "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  return (
    <Panel className="h-full">
      <PanelHeader
        label="Upcoming"
        badge={events.length > 0 ? <Badge variant="live">Live</Badge> : undefined}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 size={12} className="animate-spin text-w5" />
          <span className="text-[10px] text-w5">Loading events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="px-3.5 py-6">
          <div className="flex gap-2.5">
            <div className="w-0.5 min-h-[28px] rounded-full bg-blue shrink-0" />
            <div>
              <p className="text-[12px] text-w2 font-medium">No upcoming events found</p>
              <p className="text-[10px] text-w5 mt-0.5">Add FINNHUB_API_KEY for earnings calendar</p>
            </div>
          </div>
        </div>
      ) : (
        <motion.div
          className="divide-y divide-[var(--brd)]"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[...grouped.entries()].map(([dateKey, dateEvents]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="px-3.5 py-1.5 bg-s1/50">
                <span className="text-[9px] font-semibold text-w5 uppercase tracking-wider">
                  {formatDateLabel(dateKey)}
                </span>
              </div>

              {dateEvents.map((event) => (
                <motion.div
                  key={event.id}
                  variants={staggerItem}
                  onClick={() => {
                    if (event.clickTicker) {
                      router.push(`/research/${event.clickTicker}`);
                    }
                  }}
                  className={cn(
                    "flex gap-2.5 px-3.5 py-2.5 transition-colors duration-[120ms]",
                    event.clickTicker ? "cursor-pointer hover:bg-s2" : ""
                  )}
                >
                  <div
                    className={cn(
                      "w-0.5 min-h-[28px] rounded-full shrink-0",
                      pipeColors[event.category]
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {event.time && (
                        <span className="font-mono text-[9px] font-medium text-w5 shrink-0">
                          {event.time}
                        </span>
                      )}
                      <span className="text-[12px] text-w2 font-medium truncate">
                        {event.title}
                      </span>
                    </div>
                    {event.subtitle && (
                      <p className="text-[10px] text-w4 mt-0.5">
                        {event.subtitle}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </motion.div>
      )}
    </Panel>
  );
}
