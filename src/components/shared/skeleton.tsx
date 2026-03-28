"use client";

import { cn } from "@/lib/cn";

function SkeletonBase({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-[var(--rad-sm)] bg-gradient-to-r from-[var(--s2)] via-[var(--s3)] to-[var(--s2)] bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonLine({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonBase className={cn("h-3 w-full", className)} {...props} />;
}

export function SkeletonBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonBase className={cn("h-20 w-full", className)} {...props} />;
}

export function SkeletonCircle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <SkeletonBase className={cn("h-8 w-8 rounded-full", className)} {...props} />;
}

export function SkeletonPanel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel space-y-3 p-4", className)} {...props}>
      <SkeletonLine className="w-1/3 h-3" />
      <SkeletonLine className="w-full h-3" />
      <SkeletonLine className="w-2/3 h-3" />
      {children}
    </div>
  );
}
