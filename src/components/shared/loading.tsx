import { cn } from "@/lib/cn";

interface LoadingProps {
  className?: string;
}

export function Loading({ className }: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center py-8 opacity-50", className)}>
      <div className="w-5 h-5 border-2 border-w5 border-t-w3 rounded-full animate-spin" />
    </div>
  );
}
