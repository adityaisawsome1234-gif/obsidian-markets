import { cn } from "@/lib/cn";

type BadgeVariant = "ai" | "live" | "up" | "down" | "neutral" | "warning";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  ai: "bg-[var(--abg)] text-a border-[var(--abr)]",
  live: "bg-[var(--gbg)] text-g border-[var(--gbr)]",
  up: "bg-[var(--gbg)] text-g border-transparent",
  down: "bg-[var(--rbg)] text-r border-transparent",
  neutral: "bg-s2 text-w4 border-transparent",
  warning: "bg-[var(--ybg)] text-y border-transparent",
};

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[8px] font-bold tracking-[0.4px] uppercase px-1.5 py-0.5 rounded border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
