import { cn } from "@/lib/cn";

interface MonoNumberProps {
  value: string | number;
  className?: string;
  colored?: boolean;
}

export function MonoNumber({ value, className, colored }: MonoNumberProps) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const colorClass = colored
    ? numValue >= 0
      ? "text-g"
      : "text-r"
    : "";

  return (
    <span className={cn("font-mono", colorClass, className)}>
      {value}
    </span>
  );
}
