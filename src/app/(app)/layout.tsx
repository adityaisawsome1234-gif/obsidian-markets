"use client";

import { IconRail } from "@/components/shell/icon-rail";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { MobileTabs } from "@/components/shell/mobile-tabs";
import { useKeyboard } from "@/hooks/use-keyboard";
import { useUserStore } from "@/stores/user.store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useKeyboard();

  const { onboarding } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage before checking onboarding
  useEffect(() => setHydrated(true), []);

  // Redirect to onboarding if not completed (skip if already on onboarding)
  useEffect(() => {
    if (hydrated && !onboarding.completed && !pathname.startsWith("/onboarding")) {
      router.replace("/onboarding");
    }
  }, [hydrated, onboarding.completed, pathname, router]);

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* Icon Rail */}
      <IconRail />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[54px]">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-8 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <MobileTabs />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
