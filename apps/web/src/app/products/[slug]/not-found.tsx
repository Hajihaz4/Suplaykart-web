import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl">🫙</div>
      <h2 className="text-lg font-extrabold text-ink">Product not found</h2>
      <p className="max-w-xs text-sm text-muted">
        This product may be out of stock or no longer available.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-bold text-white shadow-brand"
      >
        Continue shopping
      </Link>
    </div>
  );
}
