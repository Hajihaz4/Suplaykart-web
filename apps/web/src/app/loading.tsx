import { ProductGridSkeleton } from "@/components/product-grid-skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="h-[57px] border-b border-border-light bg-surface" />
      <div className="mx-auto w-full max-w-6xl">
        <div className="bg-surface p-4">
          <div className="h-11 w-full animate-pulse rounded-xl bg-surface-alt" />
        </div>
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
