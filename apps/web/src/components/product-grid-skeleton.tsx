import { Skeleton } from "@suplaykart/ui";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border-light bg-surface"
        >
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-2">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
