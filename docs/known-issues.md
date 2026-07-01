# Suplaykart — Known Issues (post Phase-1 audit)

Everything blocking was fixed in the final audit. The items below are minor / deferred, with severity and recommendation. None block a Phase-1 launch.

## Accessibility

### A1 · Brand-on-brand-light contrast 4.35:1 (target 4.5:1) — *low*
Brand green `#0c831f` on brand-light `#e8f5e9` (active desktop-nav pill, a couple of small badges) measures **4.35:1**; WCAG AA wants 4.5:1 for text < 18px. This is a **brand-color decision**, so it was not changed unilaterally.
**Recommendation (pick one):** darken brand ~5% to `#0a7c1b` (→ 4.77:1, visually near-identical, improves all brand contrast), **or** use `text-brand-dark` (#085316, ~7:1) for text on tinted chips.

### A2 · PDP fixed action-bar not in a landmark — *low*
The product page's sticky "Add to cart" bar is a `<div>` outside `<main>`; axe flags one `region`. **Recommendation:** wrap it in `<footer>` or add `role="region" aria-label="Purchase"`.

## Code quality

### C1 · Duplicate design-token definitions — *medium (maintenance)*
The `@theme` token block exists in **both** `apps/web/src/app/globals.css` (the effective one) and `packages/ui/src/styles/theme.css` (not imported for CSS generation → effectively unused). A token change must be made in both places (this bit us during the audit).
**Recommendation:** make the app `@import "@suplaykart/ui/styles/theme.css"` and delete the inline duplicate, or drop `theme.css` and treat `globals.css` as the single source. Verify Tailwind v4 `@theme`-via-`@import` builds before committing.

### C2 · Repeated local `Row` / `Field` helpers — *low*
Small presentational helpers (`Row`, `Field`) are re-declared in several form/detail pages (cart, checkout-form, order detail, settings-form, admin order detail). Harmless but non-DRY.
**Recommendation:** promote a shared `<DefinitionRow>` / `<Field>` to `@suplaykart/ui` if they keep multiplying.

### C3 · Unused design-system exports — *informational*
`Dialog`, `Drawer`, `Spinner`, and `ORDER_FLOW` are exported but currently unused by the app. Kept intentionally as design-system surface. Remove if you want a leaner bundle (they're tree-shaken from route bundles anyway).

## Environment / config

### E1 · Clerk development keys — *go-live blocker for prod only*
Console shows `Clerk has been loaded with development keys`. Expected in dev. **Set production Clerk keys before deploying** (see `production-readiness.md`).

### E2 · Stray secrets backup — *security, carried from Phase 1C*
`apps/web/.env.local.save` contains real dev secrets (gitignored, won't commit). **Delete it and rotate the exposed dev Neon password + Clerk secret before go-live.**

### E3 · Placeholder account links — *low*
`/account` "Coupons & Offers", "Help & Support", "Policies & Info" link back to `/account` (Phase-2 stubs). Not broken; wire up in Phase 2.

## Deferred to Phase 2 (by design, not bugs)
Payment gateway; in-app OTP UI; address map + serviceability; server/Redis rate limiting + strict CSP; multi-supplier; notifications; wishlist; coupons; order ratings — schema + partial DAL exist (`wishlistItems`, `orderRatings`, `couponRedemptions`, `serviceableAreas`, etc.) but no Phase-1 UI.

## Not measurable in this environment
- **Lighthouse scores** — CLI not installed; run against a deployed production build. Bundle sizes (First Load 102 kB) and 0 overflow are strong proxies.
- **Authenticated-route runtime audit** — `/account/*`, `/cart`, `/checkout`, `/admin/*` sit behind Clerk phone-OTP; console/axe checks ran on public routes only. Their shells/components are the same audited primitives.
