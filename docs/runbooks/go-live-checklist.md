# Go-Live Checklist — Suplaykart cutover

Scope: switching the platform to the migrated database and (business
decision) sunsetting the old WordPress store. Every step before "Cutover" is
reversible per the rollback runbook.

## Phase 0 — decisions (owner)

- [ ] Cutover date + freeze window agreed (low-traffic hours).
- [ ] Old WP store: final-dump-and-freeze plan confirmed (see Phase 2).
- [ ] Clerk: production instance keys ready (phone-OTP identifier enabled).
- [ ] Optional keys decided: VAPID (push), Mapbox (maps), Razorpay (payments)
      — all can also land after go-live; nothing blocks on them.

## Phase 1 — migration verified

- [ ] `migration-runbook.md` executed end-to-end; Phase E green.
- [ ] `verification-checklist.md` fully checked, advisories signed off.
- [ ] Rollback runbook read by the operator; previous DB retention ≥ 7 days
      confirmed.

## Phase 2 — final data sync (only if WP kept trading after the dump)

- [ ] Put WP in maintenance mode (freeze).
- [ ] Take a final `suplaykart.sql.gz`; replace the dump (or `WP_DUMP_PATH`).
- [ ] Re-run `wp:migrate a` → `e` against the SAME branch — idempotency
      updates deltas in place. Phase E green again.
- [ ] Re-check §2 of the verification checklist (counts move with the delta).

## Phase 3 — cutover

- [ ] Confirm zero drift risk: the platform has not been serving production
      writes during the window (or accept the freeze).
- [ ] Vercel env (Production):
  - `DATABASE_URL` → the migration branch's **pooled** URL
  - `R2_*` + `NEXT_PUBLIC_R2_PUBLIC_URL` (images)
  - Clerk production keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
    `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` for the prod instance)
- [ ] Redeploy; wait for green build.
- [ ] In Neon, mark the migration branch as the app's primary going forward
      (or simply keep it as the configured target); retain the previous
      branch untouched for the rollback window.

## Phase 4 — post-cutover smoke (15 minutes, in order)

- [ ] `/api/health` and `/api/health/db` return ok.
- [ ] Home, category, product, search pages render with images.
- [ ] Fresh OTP sign-in with a real legacy phone → history imported card.
- [ ] Place a real COD test order → appears in `/admin/orders`; status
      transitions work; notification received.
- [ ] `/admin/analytics` — Legacy store migration panel counts ticking.
- [ ] No error spikes in Vercel logs.

## Phase 5 — old store sunset

- [ ] Point `suplaykart.com` DNS at Vercel (the platform); verify TLS.
- [ ] Keep WP in maintenance mode (do not delete) for the rollback window.
- [ ] Archive: final dump + files backup + `~/Suplaykart-Migration/analysis/`
      reports to durable storage (contains PII — private storage only).
- [ ] After the window: decommission WP hosting; revoke its credentials
      (DB password in the old `wp-config.php` is compromised-by-copy — it was
      in the backup folder).
- [ ] Optional post-launch (explicitly NOT built yet, do not block go-live):
      301 redirects from WooCommerce URL shapes (`/product/<slug>`) to
      platform routes (`/products/<slug>`); coupon engine for the 6 archived
      WP coupons; manual review of unlinked duplicate-phone customers.

## Phase 6 — first-week watch

- [ ] Daily: `/admin/analytics` migration panel (link attempts vs no_match
      ratio — a high no_match rate may signal phone-format issues).
- [ ] Inventory pass in `/admin/inventory` to replace the 100-default counts.
- [ ] Rollback window ends: delete the pre-cutover branch only after a full
      week of clean operation.
