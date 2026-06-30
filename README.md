# Suplaykart

Hyperlocal q-commerce platform. **Single-tenant** (multi-supplier-ready),
Next.js 15 + Drizzle (Postgres/Neon) + Clerk, in a Turborepo monorepo.

> **Status: Phase 1A — Foundation + Schema.** No storefront/admin UI yet; no
> legacy pages migrated yet.

## Layout

```
apps/
  web/              Next.js 15 app (App Router) — foundation placeholder only
packages/
  db/               Drizzle schema (Phase-1) + client + migrations + seed
  core/ ui/ auth/ validators/ config/   (placeholders — Phase 1B+)
docs/
  adr/0001-…        Approved architecture + Phase-1 scope
  guides/           Migration analysis + phase-1-blueprint.md + local-development.md
old-html/           Legacy prototypes (read-only migration source)
```

## Quick start

```bash
pnpm install
cp .env.example apps/web/.env.local        # fill in Neon + Clerk values
pnpm db:generate                           # generate SQL migration from schema
pnpm db:migrate                            # apply to Neon (needs DATABASE_URL)
pnpm --filter @suplaykart/db seed          # baseline seed (supplier/store/coupons)
pnpm dev                                    # run apps/web
```

See **[docs/guides/local-development.md](docs/guides/local-development.md)** for
the full setup, and **[docs/guides/phase-1-blueprint.md](docs/guides/phase-1-blueprint.md)**
for the schema/lifecycle/route spec.

## Scripts (root)

| Command | Description |
| --- | --- |
| `pnpm dev` | Run all apps in dev (Turbo) |
| `pnpm build` | Build all packages/apps |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm db:generate` | Drizzle: schema → SQL migration (offline) |
| `pnpm db:migrate` | Drizzle: apply migrations (needs `DATABASE_URL`) |
| `pnpm db:studio` | Drizzle Studio |
