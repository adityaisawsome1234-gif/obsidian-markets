"use client";

import { cn } from "@/lib/cn";
import { forwardRef } from "react";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** @deprecated Glow effect removed for production polish. Prop kept for compat. */
  glow?: boolean;
  delay?: number;
  noAnimation?: boolean;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, children, glow: _glow, delay: _delay, noAnimation: _noAnim, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-s1 border border-[var(--brd)] rounded-[var(--rad)] overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Panel.displayName = "Panel";
