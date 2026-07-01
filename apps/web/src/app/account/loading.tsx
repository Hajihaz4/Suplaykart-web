import { Skeleton } from "@suplaykart/ui";

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="h-[57px] border-b border-border-light bg-surface" />
      <div className="mx-auto w-full max-w-md space-y-3 p-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
