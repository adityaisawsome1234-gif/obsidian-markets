import { cn } from "@/lib/cn";
import { formatPct } from "@/lib/format";

interface ChangeBadgeProps {
  value: number;
  className?: string;
}

export function ChangeBadge({ value, className }: ChangeBadgeProps) {
  const isPositive = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px]",
        isPositive
          ? "bg-[var(--gbg)] text-g"
          : "bg-[var(--rbg)] text-r",
        className
      )}
    >
      {formatPct(value)}
    </span>
  );
}
