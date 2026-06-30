/**
 * Phase 1A foundation health placeholder — intentionally NOT the storefront.
 * Storefront and admin UI are built in later phases (no UI migration in 1A).
 */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 p-8">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
        Phase 1A · Foundation
      </span>
      <h1 className="text-2xl font-black tracking-tight text-brand">
        Suplaykart
      </h1>
      <p className="text-sm leading-relaxed text-neutral-600">
        Foundation is running. Monorepo, Next.js 15, Tailwind, Drizzle schema,
        and Clerk auth are configured. Storefront and admin UI arrive in later
        phases — no UI has been migrated yet.
      </p>
    </main>
  );
}
