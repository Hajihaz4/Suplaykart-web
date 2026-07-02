# Migration Runbook — WP → Suplaykart Live Import

Operator: Haji (or Claude with Haji present). Est. wall-clock: **2–3 hours**
(most of it Phase B uploads). Status: ⏸ waiting on **R2 credentials** and
**migration-branch approval** — do not start until both exist.

## 0. Preconditions (all must be true)

- [ ] Owner approved the migration branch + provided R2 credentials.
- [ ] Repo on `phase2-development`, up to date (`git pull`), clean tree.
- [ ] Inputs present and untouched:
  - dump: `~/Downloads/Suplaykart backup/suplaykart.sql.gz` (~15 MB gz — verify `gzip -t`; the 551 MB file alongside it is the *files* archive, not the dump)
  - workspace: `~/Suplaykart-Migration/` with `raw-csv/` (8 CSVs) and `images/` (1,798 files)
- [ ] **Staleness decision made**: the dump is from **2026-06-22**. If the old
  WP store took orders after that date, put WP in maintenance mode, take a
  fresh `suplaykart.sql.gz`, replace the file (same path or `WP_DUMP_PATH`),
  and re-extract nothing — the ETL reads the dump directly. (CSV patch files
  stay as-is; they only cover the 2025 corruption window.)
- [ ] Gates green: `pnpm typecheck && pnpm test && pnpm build`.
- [ ] Rehearsal passes:
  ```bash
  pnpm --filter @suplaykart/db wp:migrate all --dry-run
  ```
  Phase E must print no `VALIDATION FAILED` and end with `[wp-migrate] done.`
  Expected phase E: products 904/904 · variants 1043/1043 · categories 46/46 ·
  customers 1645/1645 · orders 8124 (8063 delivered) · revenue ₹1,156,487.20.

## 1. Create the migration branch (Neon)

1. Neon console → the Suplaykart project → **Branches → New branch** from the
   production branch. Name: `wp-migration-YYYYMMDD`.
2. Copy the branch's **pooled** connection string.
3. The branch inherits the schema incl. migration 0006 (applied to production
   2026-07-02). If the branch predates 0006 for any reason:
   `DATABASE_URL=<branch url> pnpm --filter @suplaykart/db migrate`.

## 2. Shell environment (never echo values)

```bash
# production URL — REQUIRED for the fail-closed guard (never printed)
set -a; . <(grep -E '^DATABASE_URL=' apps/web/.env.local); set +a
export WP_MIGRATION_DATABASE_URL='<branch pooled url>'   # paste, don't echo

# Phase B (owner-provided)
export R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=…
export NEXT_PUBLIC_R2_PUBLIC_URL='https://<public-r2-host>'
```

Guard behavior: the tool **refuses to start** if the target equals
`DATABASE_URL` (host+db compared, Neon `-pooler` aliases normalized) and
**fails closed** if `DATABASE_URL` is unset. Do not set
`WP_MIGRATION_ALLOW_UNCHECKED` — it exists only for environments with no
production database.

## 3. Run the import

Run phases individually (clearer checkpoints; `all` is equivalent):

```bash
cd packages/db
npx tsx scripts/wp-migrate.ts a     # catalog       (~1 min)
npx tsx scripts/wp-migrate.ts b     # images → R2   (30–60 min; keep machine awake)
npx tsx scripts/wp-migrate.ts c     # customers     (~1 min)
npx tsx scripts/wp-migrate.ts d     # orders        (~5 min)
npx tsx scripts/wp-migrate.ts e     # validation gate
```

- Each phase prints its stats and writes a report to
  `~/Suplaykart-Migration/analysis/reports/`.
- **Crash/interruption**: just re-run the phase — every phase is idempotent
  (id_map + per-entity transactions). Do not run two instances concurrently.
- Phase B without R2 env falls back to manifest-only (no rows) — if that
  happens, the env is wrong; fix and re-run B.
- **Phase E exit code 0 is the gate.** Non-zero → stop, read the report, fix,
  re-run the offending phase, then E again. Nothing proceeds past a red E.

## 4. After a green Phase E

1. Work through `verification-checklist.md` (same folder).
2. Keep the branch untouched; report results to Haji.
3. Cutover is a separate decision → `go-live-checklist.md`.

## Known advisories (expected, not failures)

- 403 delivered legacy orders have no line items in any surviving source
  (totals correct; item detail lost to the 2025 corruption).
- 14 products import as "Uncategorized"; 2 priceless variants import inactive;
  1 product image + 12 category thumbnails missing from disk.
- Untracked in-stock items receive `quantityOnHand = 100` — adjust real
  counts in `/admin/inventory` after import.
