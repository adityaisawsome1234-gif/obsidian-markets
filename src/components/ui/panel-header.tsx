import { cn } from "@/lib/cn";

interface PanelHeaderProps {
  label: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ label, badge, actions, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center px-3.5 py-2.5 border-b border-[var(--brd)] gap-1.5",
        className
      )}
    >
      <span className="text-[10px] font-semibold tracking-[0.6px] text-w4 uppercase">
        {label}
      </span>
      {badge}
      {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
