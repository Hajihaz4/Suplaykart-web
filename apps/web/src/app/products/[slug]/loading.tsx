import { Skeleton } from "@suplaykart/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="h-[57px] border-b border-border-light" />
      <div className="mx-auto w-full max-w-3xl">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="space-y-3 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
