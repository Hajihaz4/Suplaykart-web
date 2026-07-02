# Verification Checklist — post-import, pre-cutover

Run against the **migration branch** after a green Phase E. All SQL via
`psql "$WP_MIGRATION_DATABASE_URL"` (or Neon console). Expected values are
from the verified 2026-06-22 dump — a fresher final dump shifts them upward;
re-read the Phase E report for the run's own expected/actual pairs.

## 1. Automated gate

- [ ] Phase E exited 0; every exact pair shows `*_expected == *_actual`, and
      the one designed lower-bound pair satisfies
      `orders_delivered_lower_bound_actual >= _expected` (it reads 8,063 ≥
      7,938 on the Jun-22 dump — inequality here is correct, not a failure).
- [ ] Phase reports archived (copy `~/Suplaykart-Migration/analysis/reports/`
      somewhere durable alongside the dump).

## 2. Database counts (branch)

- [ ] `select count(*) from products;` → **904** (+ any pre-existing platform rows)
- [ ] `select count(*) from product_variants;` → **1,043**
- [ ] `select count(*) from inventory;` → **1,043** (1:1 with variants)
- [ ] `select count(*) from categories where slug <> 'uncategorized';` → **46**
- [ ] `select count(*) from wp_migration.legacy_customers;` → **1,645**
- [ ] `select count(*), sum(total) filter (where status='delivered') from wp_migration.legacy_orders;` → **8,124 / 115,648,720** (paise)
- [ ] `select count(*) from wp_migration.legacy_order_items;` → **≈24,579**
- [ ] Integrity spot-queries all return **0**:
  ```sql
  select count(*) from products p left join product_variants v on v.product_id = p.id where v.id is null;
  select count(*) from product_variants v left join inventory i on i.variant_id = v.id where i.id is null;
  select count(*) from inventory where quantity_on_hand < 0;
  select count(*) from wp_migration.legacy_orders where status not in ('delivered','cancelled');
  ```

## 3. Images (after Phase B with R2)

- [ ] Phase B report: `images_uploaded` ≈ `manifest_entries` (**1,434** from
      the Jun-22 dump — the manifest already excludes the 13 known-missing
      files, so do NOT subtract them again; on re-runs subtract only
      `images_skipped_existing`). A shortfall against `manifest_entries`
      means real uploads failed — investigate before proceeding.
- [ ] `select count(*) from product_images;` matches `images_uploaded` for products.
- [ ] Open 5 random `product_images.url` values in a browser — all render from
      the R2 public host.

## 4. App-level QA (app pointed at the branch)

Point a local dev/preview at the branch (`DATABASE_URL=<branch>` in
`.env.local`, restart dev server) — do NOT change Vercel prod env for this.

- [ ] `/` and `/categories` render migrated categories (incl. vendor
      storefront categories: Empire Foods, Shawarma Town, …).
- [ ] 5 random product pages: name, price (₹ correct, not ×100 off), variant
      labels (e.g. "1 Kg / 5 Kg"), images, related products.
- [ ] Search finds migrated products (e.g. "milk", a synonym like "atta").
- [ ] Add to cart → checkout gate works against migrated inventory.
- [ ] Admin: `/admin/products` lists migrated catalog; `/admin/inventory`
      shows clamped stock; `/admin/analytics` shows the **Legacy store
      migration** panel with customers 0/1,645 linked (no sign-ins yet).

## 5. Linking QA (staging, with a test phone you control)

- [ ] Insert (or pick) a legacy customer whose phone you can OTP-verify; sign
      in fresh → `/account` shows "Order history imported — N orders".
- [ ] `/account/orders#legacy` lists that customer's WC- orders, read-only.
- [ ] `select outcome, count(*) from legacy_customer_links group by 1;` shows
      the expected outcome; the claimed `legacy_customers` row has
      `linked_user_id` set; re-sign-in does not duplicate anything.
- [ ] A second account with a non-matching phone shows the quiet "no history
      found" state and records `no_match`.

## 6. Advisory acceptance (owner sign-off, explicit)

- [ ] 403 delivered legacy orders without line items — accepted as-is.
- [ ] 14 "Uncategorized" products — reassigned in admin, or accepted.
- [ ] 2 priceless variants (inactive) — priced in admin, or accepted.
- [ ] Untracked-instock quantity default (100) — real counts to be set in
      `/admin/inventory` post-cutover.
- [ ] Duplicate-phone groups (112) — newest-wins linking accepted; older
      duplicates remain unlinked (`legacy_customers where linked_user_id is
      null` after their group's newest is claimed) for manual review.
