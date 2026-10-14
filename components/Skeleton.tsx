import React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-800/60 ${className}`}
      {...props}
    />
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-[#121622]/80 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function DateChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
        <div className="space-y-2 max-w-[70%]">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-80 rounded-2xl" />
        </div>
      </div>
      <div className="flex items-start gap-3 justify-end">
        <div className="space-y-2 max-w-[70%] items-end flex flex-col">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-80 rounded-2xl" />
        </div>
        <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3 p-4">
      {Array.from({ length: 16 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}
