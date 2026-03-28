"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/cn";
import { priceFlashUp, priceFlashDown } from "@/lib/animations";

interface PriceFlashProps {
  value: number;
  children: React.ReactNode;
  className?: string;
}

export function PriceFlash({ value, children, className }: PriceFlashProps) {
  const controls = useAnimationControls();
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      const isUp = value > prevValue.current;
      controls.start(isUp ? priceFlashUp : priceFlashDown);
      prevValue.current = value;
    }
  }, [value, controls]);

  return (
    <motion.div
      animate={controls}
      className={cn("rounded-[var(--rad-sm)] px-1 -mx-1", className)}
    >
      {children}
    </motion.div>
  );
}
