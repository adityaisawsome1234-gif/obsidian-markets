import { cn } from "@/lib/cn";

interface SharedGridProps {
  columns?: number;
  children: React.ReactNode;
  className?: string;
}

export function SharedGrid({ columns = 4, children, className }: SharedGridProps) {
  return (
    <div
      className={cn(
        "grid gap-px bg-[var(--brd)] border border-[var(--brd)] rounded-[var(--rad)] overflow-hidden",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

interface SharedGridCellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SharedGridCell({ className, children, ...props }: SharedGridCellProps) {
  return (
    <div
      className={cn("bg-s1 px-3 py-2.5", className)}
      {...props}
    >
      {children}
    </div>
  );
}
