"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ALPHA_NAV = [
  { href: "/alpha", label: "Your Edge" },
  { href: "/alpha/journal", label: "Trade Journal" },
  { href: "/alpha/recommendations", label: "Trade Ideas" },
  { href: "/alpha/weekly", label: "Weekly Report" },
  { href: "/alpha/admin", label: "Admin" },
];

export default function AlphaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Sub-navigation */}
      <nav className="flex items-center gap-1 mb-5 border-b border-[var(--brd)] pb-2">
        {ALPHA_NAV.map(item => {
          const isActive = item.href === "/alpha"
            ? pathname === "/alpha"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded transition-colors",
                isActive
                  ? "text-w bg-s3"
                  : "text-w4 hover:text-w hover:bg-s2",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
