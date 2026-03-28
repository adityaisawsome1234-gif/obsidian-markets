"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useUserStore } from "@/stores/user.store";
import { getActivePrompts } from "@/services/user-progression.service";

const moduleRoutes: Record<string, string | null> = {
  options: "/options",
  screener: "/screener",
  macro: "/macro",
  deep_dive: "/ai",
  engagement: null,
};

export function ProgressionPrompts() {
  const router = useRouter();
  const { progression, dismissPrompt, unlockModule } = useUserStore();
  const prompts = getActivePrompts(progression);
  const activePrompt = prompts[0] ?? null;

  if (!activePrompt) return null;

  const handleShow = () => {
    unlockModule(activePrompt.module);
    dismissPrompt(activePrompt.id);
    const route = moduleRoutes[activePrompt.module];
    if (route) router.push(route);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={activePrompt.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="bg-[var(--abg)] border border-a/20 rounded-[var(--rad)] p-4 flex items-center gap-3"
      >
        <Sparkles className="size-4 text-a shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-w truncate">
            {activePrompt.title}
          </p>
          <p className="text-[11px] text-w3 truncate">
            {activePrompt.description}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="primary" size="sm" onClick={handleShow}>
            Show me
            <ArrowRight className="size-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismissPrompt(activePrompt.id)}
            className="text-w4"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
