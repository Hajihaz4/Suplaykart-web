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

## Legacy-customer linking (the lazy-link feature)

Built on top of the staging schema (`packages/db/src/dal/legacy.ts` +
migration 0006 `legacy_customer_links`):

- **Trigger**: first OTP sign-in (`syncAndLink` in `apps/web/src/lib/auth.ts`)
  and lazily on the `/account` page for users created via the Clerk webhook.
  Zero queries added to the returning-user hot path; never blocks sign-in.
- **Once per user**: `legacy_customer_links.userId` PK — terminal outcomes
  (`linked` / `ambiguous_linked_latest` / `no_match` / `already_claimed`) are
  recorded exactly once. Transient states (placeholder phone, staging schema
  absent) are not recorded, so linking still happens once the data arrives.
- **Never overwrites**: `linked_user_id` is only set while NULL, inside a
  transaction with a post-update verify; ledger + claim commit atomically.
- **Ambiguity policy — newest-or-nothing**: only the most recently registered
  phone match may be claimed; if it's already claimed, the outcome is
  `already_claimed` and older duplicates stay unlinked for manual review.
  Deterministic under races (loser records the same outcome a later arrival
  would).
- **Guest orders** (`wp_customer_id NULL`) are never linked or listed.
- **Surfaces**: `/account` status card, read-only "From our previous store"
  section on `/account/orders#legacy` (badge crash-proofed against unknown
  staging statuses), and a "Legacy store migration" panel on
  `/admin/analytics` (customers linked, orders attributed, legacy revenue,
  attempts breakdown — hidden until staging has data).
- **Tests**: 10 PGlite cases in `packages/db/test/legacy-link.test.ts`
  (exact match, duplicate phone, newest-claimed policy, no match, already
  linked, guest orders, transient outcomes, idempotency, stats, no-schema
  grace).

## Not done yet (by design)

- Live import awaits the fresh Neon branch + owner go-ahead.
- Phase B uploads await R2 credentials.
