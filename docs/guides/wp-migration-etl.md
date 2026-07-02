# WP → Suplaykart Migration ETL

One-shot toolkit migrating the old WooCommerce store (MySQL dump = source of
truth; WebToffee CSVs only for reconciliation + the Oct-22 order-recovery
patch) into a Suplaykart database. Code: `packages/db/src/etl/wp/`, CLI:
`packages/db/scripts/wp-migrate.ts`.

```bash
# full rehearsal — in-memory PGlite, zero network, writes only reports
pnpm --filter @suplaykart/db wp:migrate all --dry-run

# live import into the FRESH Neon branch (never production)
export DATABASE_URL=<production url>            # enables the safety cross-check
export WP_MIGRATION_DATABASE_URL=<branch url>   # the import target
pnpm --filter @suplaykart/db wp:migrate all
```

Inputs: `WP_DUMP_PATH` (default `~/Downloads/Suplaykart backup/suplaykart.sql.gz`),
`WP_WORKSPACE` (default `~/Suplaykart-Migration`, holds `raw-csv/` + `images/`).
Reports land in `<workspace>/analysis/reports/` after every phase.

## Phases

| Phase | Target | What it does |
|---|---|---|
| **A** catalog | real tables | 46 categories (parents first, adopt-by-slug), 904 products (draft/private → inactive), 1,043 variants (247 variations + simple defaults, ₹→paise, cheapest active = default), inventory (negatives clamped, untracked-instock → qty 100) |
| **B** images | real tables | rebuilds links from `_thumbnail_id`/gallery/termmeta → attachment GUID → extracted originals (basename match); uploads to R2 + inserts `product_images`; **manifest-only** without R2 creds or in dry-run |
| **C** customers | `wp_migration.legacy_customers` | 1,645 customers staged with normalized phones for **lazy Clerk phone-match at first OTP login**; staff skipped; never writes `users` |
| **D** orders | `wp_migration.legacy_orders`(+items) | merge: intact DB orders (3,165) ⊕ Oct-22 CSV patch for corruption-blanked rows (4,834) ⊕ CSV-only purged orders (125); 78 true abandonments skipped; guests unlinked |
| **E** validate | read-only | re-derives expectations (all products mapped/variant-ed/inventoried, customer counts, order lower bounds); non-zero exit on failure — the go/no-go gate |

## Safety & idempotency

- **Production guard**: live runs refuse to start unless the target differs
  from `DATABASE_URL` by host+database (Neon `-pooler` aliases normalized);
  fails **closed** when `DATABASE_URL` is unresolvable
  (`WP_MIGRATION_ALLOW_UNCHECKED=1` to override consciously).
- **Idempotent + resumable**: every row is registered in
  `wp_migration.id_map`; re-runs update-in-place. Each product (row + variants
  + inventory + map) and each order (row + items) commits in one transaction,
  so a crash resumes cleanly; orphans from pre-transactional runs are adopted
  via `attributes.wcLegacyId`.
- **Reversible staging**: phases C/D live entirely in the `wp_migration`
  schema — `drop schema wp_migration cascade` reverts them.

## Dry-run results against the real dump (2026-07-02)

Phase E passed all expectations: 904/904 products, 1,043/1,043 variants,
46/46 categories, 1,645/1,645 customers, 8,124 orders (8,063 delivered,
₹1,156,487.20 lifetime revenue). Known advisories: 403 delivered orders have
no line items in any surviving source; 14 products uncategorized; 2 variants
priceless (imported inactive); 1 product image + 12 category thumbnails
missing from disk.

## Not done yet (by design)

- Live import awaits the fresh Neon branch + owner go-ahead.
- Phase B uploads await R2 credentials.
- The lazy-link app feature (match `legacy_customers.phone` on first OTP
  sign-in, set `linked_user_id`, surface legacy order history) is follow-up
  app work, not part of the ETL.
