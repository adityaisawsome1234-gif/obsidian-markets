"use client";

import { SkeletonLine, SkeletonBlock } from "@/components/shared/skeleton";

export function DeepDiveSkeleton() {
  return (
    <div className="space-y-6">
      {/* Conviction gauge skeleton */}
      <div className="flex justify-center py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-[160px] h-[90px] rounded-full animate-shimmer bg-gradient-to-r from-[var(--s2)] via-[var(--s3)] to-[var(--s2)] bg-[length:200%_100%]" />
          <SkeletonLine className="w-24 h-3" />
          <SkeletonLine className="w-16 h-4" />
        </div>
      </div>

      {/* Signal radar skeleton */}
      <div className="flex justify-center">
        <div className="w-[260px] h-[260px] rounded-full animate-shimmer bg-gradient-to-r from-[var(--s2)] via-[var(--s3)] to-[var(--s2)] bg-[length:200%_100%]" />
      </div>

      {/* Section skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-s1 border border-[var(--brd)] rounded-[var(--rad)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <SkeletonLine className="w-5 h-5 rounded" />
            <SkeletonLine className="w-40 h-4" />
          </div>
          <SkeletonBlock className="h-2 rounded-full" />
          <SkeletonLine className="w-full h-3" />
          <SkeletonLine className="w-3/4 h-3" />
          <div className="grid grid-cols-2 gap-1">
            {Array.from({ length: 4 }).map((_, j) => (
              <SkeletonBlock key={j} className="h-12" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
