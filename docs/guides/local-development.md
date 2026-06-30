# Local Development

Setup for the Suplaykart monorepo (Phase 1A — foundation + schema).

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 20 (LTS) | `.nvmrc` → `lts/*` |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Neon account | — | Postgres database (free tier fine) |
| Clerk account | — | Phone + SMS OTP enabled |

## 1. Install

```bash
pnpm install
```

This installs the workspace: `apps/web` + `packages/db`. The `core`/`ui`/`auth`/
`validators`/`config` packages are README-only placeholders until Phase 1B.

## 2. Provision services

### Neon (Postgres)
1. Create a project at [neon.tech](https://neon.tech) (or via the Vercel Marketplace).
2. Copy the **pooled** connection string (host contains `-pooler`).
3. Put it in `DATABASE_URL` (see step 3).

### Clerk (auth)
1. Create an application at [clerk.com](https://clerk.com).
2. **Enable "Phone number"** as an identifier and **SMS OTP** as the verification
   method (Email/password can be disabled). *WhatsApp OTP is Phase-2.*
3. Copy the **Publishable key** (`pk_…`) and **Secret key** (`sk_…`).

## 3. Environment

```bash
cp .env.example apps/web/.env.local
```

Fill in `apps/web/.env.local`:

```
DATABASE_URL="postgresql://…-pooler.…/db?sslmode=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_…"
CLERK_SECRET_KEY="sk_test_…"
```

For Drizzle CLI commands, `packages/db` also reads `DATABASE_URL` — either export
it in your shell or create `packages/db/.env` (gitignored).

> Validation: `apps/web/src/env.ts` validates env at boot. Set
> `SKIP_ENV_VALIDATION=1` to bypass (e.g. CI builds without secrets).

## 4. Database

```bash
pnpm db:generate    # schema → SQL migration in packages/db/drizzle/ (offline)
pnpm db:migrate     # apply migrations to Neon (needs DATABASE_URL)
pnpm --filter @suplaykart/db seed   # baseline data (supplier, store, coupons, areas)
pnpm db:studio      # browse data in Drizzle Studio
```

- `db:generate` is **offline** — it diffs the schema and writes SQL; no DB needed.
- `db:migrate` / `seed` / `studio` require a live `DATABASE_URL`.

## 5. Run

```bash
pnpm dev            # apps/web on http://localhost:3000
```

You should see the Phase 1A foundation placeholder. Storefront/admin UI arrive in
later phases.

## Common tasks

| Command | What it does |
| --- | --- |
| `pnpm build` | Production build (`apps/web` → `.next` standalone) |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm lint` | Lint |
| `pnpm db:generate` | Regenerate migration after editing `packages/db/src/schema/*` |

## Project conventions (from the blueprint)

- **Money** is stored as integer **paise** (₹1 = 100). Never floats.
- **IDs** are `uuid`; orders also carry a human `order_number` (`SP-XXXXXX`).
- Column names are `snake_case` (Drizzle `casing` maps from camelCase TS keys).
- The schema is the source of truth — edit `packages/db/src/schema/*`, then
  `pnpm db:generate`.
