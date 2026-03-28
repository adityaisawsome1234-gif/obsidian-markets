"use client";

import { useEffect, useRef } from "react";
import { useSpring, useTransform, motion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({ value, format, className, duration = 0.6 }: AnimatedNumberProps) {
  const spring = useSpring(value, { stiffness: 100, damping: 30, duration });
  const display = useTransform(spring, (current: number) =>
    format ? format(current) : current.toFixed(2)
  );
  const prevValue = useRef(value);

  useEffect(() => {
    prevValue.current = value;
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={cn("font-mono tabular-nums", className)}>
      <AnimatedText value={display} />
    </motion.span>
  );
}

function AnimatedText({ value }: { value: MotionValue<string> }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const unsubscribe = value.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [value]);

  return <span ref={ref} />;
}
