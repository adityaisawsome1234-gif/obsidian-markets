"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, LogOut, Settings, User } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import Link from "next/link";

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/charts": "Charts",
  "/options": "Options Intelligence",
  "/macro": "Macro Dashboard",
  "/news": "News & Sentiment",
  "/screener": "Screener",
  "/portfolio": "Portfolio",
  "/ai": "Obsidian AI",
  "/alerts": "Alerts",
  "/settings": "Settings",
};

const MOCK_NOTIFICATIONS = [
  { id: 1, text: "NVDA crossed above $880 — price alert triggered", time: "2m ago", unread: true },
  { id: 2, text: "Portfolio up 0.75% today — daily summary", time: "1h ago", unread: true },
  { id: 3, text: "AAPL earnings in 5 days — reminder", time: "3h ago", unread: false },
];

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    document.cookie = "obsidian_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("obsidian-user");
    localStorage.removeItem("obsidian_portfolio");
    router.push("/landing");
  };

  const pageName = pathname.startsWith("/research/")
    ? "Research"
    : pageNames[pathname] || "Obsidian Markets";

  const ticker = pathname.startsWith("/research/")
    ? pathname.split("/research/")[1]
    : null;

  return (
    <header className="h-[44px] flex items-center px-4 border-b border-[var(--brd)] gap-4 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] min-w-0">
        <span className="text-w4">Obsidian</span>
        <span className="text-w5">/</span>
        <span className="text-w2 font-medium">{pageName}</span>
        {ticker && (
          <>
            <span className="text-w5">/</span>
            <span className="text-w font-semibold tracking-[-0.2px]">{ticker}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center gap-2 bg-s2 border border-[var(--brd)] rounded-[7px] px-3 py-1.5 min-w-[220px] cursor-pointer hover:border-[var(--brd2)] transition-colors"
      >
        <Search size={13} className="text-w5" />
        <span className="text-[11px] text-w5 flex-1 text-left">Search...</span>
        <kbd className="text-[9px] text-w5 bg-s3 px-1.5 py-0.5 rounded font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Notifications */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setNotifOpen((prev) => !prev)}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-w4 hover:text-w3 hover:bg-s2 transition-colors cursor-pointer"
        >
          <Bell size={16} strokeWidth={1.5} />
          {unreadCount > 0 && (
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-r rounded-full" />
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-full mt-1 w-[320px] bg-s1 border border-[var(--brd2)] rounded-[var(--rad)] shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--brd)]">
              <span className="text-[11px] font-semibold text-w2">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-a hover:text-a2 cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 border-b border-[var(--brd)] last:border-0 transition-colors ${
                    n.unread ? "bg-s2/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {n.unread && <div className="w-1.5 h-1.5 rounded-full bg-a mt-1.5 shrink-0" />}
                    <div className={n.unread ? "" : "ml-3.5"}>
                      <p className="text-[11px] text-w3 leading-[1.5]">{n.text}</p>
                      <span className="text-[9px] text-w5 mt-0.5 block">{n.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/alerts"
              onClick={() => setNotifOpen(false)}
              className="block text-center text-[10px] text-a hover:text-a2 py-2 border-t border-[var(--brd)] transition-colors"
            >
              View All Alerts
            </Link>
          </div>
        )}
      </div>

      {/* Avatar + Dropdown */}
      <div ref={avatarRef} className="relative">
        <button
          onClick={() => setAvatarOpen((prev) => !prev)}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-a to-a2 flex items-center justify-center text-[9px] font-bold text-white hover:ring-2 hover:ring-a/40 transition-all cursor-pointer"
        >
          O
        </button>

        {avatarOpen && (
          <div className="absolute right-0 top-full mt-1 w-[180px] bg-s1 border border-[var(--brd2)] rounded-[var(--rad)] shadow-2xl z-50 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-[var(--brd)]">
              <p className="text-[11px] font-medium text-w2">Obsidian User</p>
              <p className="text-[10px] text-w5">Free Plan</p>
            </div>
            <div className="py-1">
              <Link
                href="/settings"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[11px] text-w3 hover:bg-s2 transition-colors"
              >
                <Settings size={13} className="text-w4" />
                Settings
              </Link>
              <Link
                href="/ai/accuracy"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[11px] text-w3 hover:bg-s2 transition-colors"
              >
                <User size={13} className="text-w4" />
                AI Accuracy
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-[11px] text-r hover:bg-[var(--rbg)] transition-colors w-full text-left cursor-pointer"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
