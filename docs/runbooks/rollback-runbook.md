# Rollback Runbook — WP → Suplaykart Migration

Principle: **the migration never touches production until cutover**, so every
pre-cutover rollback is cheap and total. Post-cutover rollback = switch the
app back to the previous database.

## A. Failure during the branch import (any phase)

Nothing outside the migration branch (and R2) was written.

- **Preferred**: fix the cause and **re-run the phase** — all phases are
  idempotent (id_map upserts, per-entity transactions); a re-run repairs a
  partial run in place.
- **Full reset**: delete the Neon branch (`wp-migration-YYYYMMDD`) in the
  console and start the runbook from step 1. Cost: minutes.

## B. Bad data discovered after import, before cutover

Same options as A. For surgical partial rollback:

- **Phases C + D only** (customers/orders staging) — one statement on the
  branch, by design:
  ```sql
  drop schema wp_migration cascade;
  ```
  Re-run **C and D only** to rebuild staging — they upsert by
  `wp_user_id`/`wp_order_id` and do not need the id_map.
  ⚠️ **Never re-run Phase A after dropping the schema**: the drop also
  removes `wp_migration.id_map`, and while products/categories self-heal by
  adoption, **variants have no adoption path** — a Phase A re-run would
  silently duplicate all ~1,043 variants (plus inventory rows, plus a second
  default variant per product), and Phase E would not catch it. If Phase A
  must be redone after the id_map is gone, use the full reset (delete the
  branch, option A).
- **Phase A (catalog)** — there is deliberately no delete tool. Rolling back
  catalog rows = delete the branch and re-import (option A). Never hand-delete
  products/variants/inventory rows.
- **Migration 0006 table** (`legacy_customer_links`) — part of the app
  schema; empty until real users link. Leave it; it is inert. (Reversal, if
  ever required: `drop table legacy_customer_links;` — nothing else
  references it.)

## C. R2 objects

Phase B uploads under two prefixes only:
`products/<uuid>/wc-<attachmentId>.<ext>` and
`categories/<uuid>/wc-<attachmentId>.<ext>`.

- Unreferenced objects are harmless (nothing links to them after a DB
  rollback). To reclaim: bulk-delete those two prefixes in the Cloudflare R2
  dashboard. Do NOT delete other prefixes — the admin media manager (Phase 2a)
  writes to the same bucket.
- Re-run semantics: on a **plain re-run** (catalog rows intact, id_map
  intact) Phase B skips already-mapped images and re-PUTs the rest to the
  same keys — fully idempotent. After a **full reset** (branch deleted +
  re-imported) Phase A mints new uuids, so Phase B writes NEW keys and the
  old-uuid objects become orphans — clean up the two prefixes if tidiness
  matters. Do not re-run Phase B after a `drop schema wp_migration` without
  also re-running the full reset: the image id_map is gone and B would insert
  duplicate `product_images` rows.

## D. After cutover (app already pointed at the migrated database)

Pre-requisites baked into the go-live checklist: the pre-cutover database
(previous branch/primary) is retained untouched for ≥ 7 days, and cutover
happens in a freeze window.

1. **Switch back**: restore the previous `DATABASE_URL` in Vercel (and
   `.env.local` for local ops). Redeploy/redeploy-env. The app is now exactly
   pre-migration.
2. **Data written between cutover and rollback** (new users/orders on the
   migrated DB) is stranded on the abandoned branch — this is why cutover
   uses a freeze window and immediate post-cutover verification; roll back
   within the window and nothing meaningful is lost. If real orders did land,
   export them from the abandoned branch before deleting it (they are normal
   `orders` rows; Neon keeps the branch until you remove it).
3. **Legacy links** live in the migrated DB (`legacy_customer_links` +
   `wp_migration.*`) — they roll back with it; nothing to clean on the old DB.
4. R2: leave objects in place (they don't affect the old DB); clean per §C
   only if abandoning the migration permanently.

## E. Old WordPress store

The WP site is untouched by every path above (the dump/CSVs are read-only
copies). If WP was placed in maintenance mode for a final dump, taking it
back out of maintenance mode restores the old store completely.
