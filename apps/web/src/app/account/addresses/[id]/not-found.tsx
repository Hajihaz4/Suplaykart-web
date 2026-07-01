import Link from "next/link";

export default function AddressNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl">📍</div>
      <h2 className="text-lg font-extrabold text-ink">Address not found</h2>
      <p className="max-w-xs text-sm text-muted">
        This address may have been removed or doesn&apos;t belong to you.
      </p>
      <Link
        href="/account/addresses"
        className="inline-flex h-11 items-center rounded-lg bg-brand px-5 text-sm font-bold text-white shadow-brand"
      >
        Back to addresses
      </Link>
    </div>
  );
}
