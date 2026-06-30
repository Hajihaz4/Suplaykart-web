# Phase 1C — Implementation Report (Design System + UI Foundation)

**Date:** 2026-07-01 · **Scope:** UI foundation only — **no business logic, checkout, orders, inventory, or admin** (all mock data, strict TypeScript, mobile-first).
**Result:** ✅ `packages/ui` design system + 6 foundation routes; typecheck + build green; verified visually at 390 / 768 / 1024+.

---

## 1. Files created / changed

### New package — `packages/ui`
```
packages/ui/
  package.json · tsconfig.json
  src/
    index.ts                       (barrel)
    lib/cn.ts  lib/format.ts
    styles/theme.css               (@theme design tokens)
    tokens/  colors · spacing · typography · shadows · radius
             breakpoints · z-index · index (centralized `theme`)
    components/  button · input · search-bar · badge · card · drawer
                 dialog · toast · skeleton · empty-state · spinner · index
    app/  app-header · bottom-navigation · product-card · category-card
          cart-button · quantity-stepper · address-chip · search-header
          section-header · store-status-banner · app-shell · index
    types.ts
```

### `apps/web` (changed/new)
- **changed:** `package.json` (+`@suplaykart/ui`, `lucide-react`), `next.config.ts` (transpile ui), `src/app/globals.css` (Tailwind v4 `@theme` + `@source`), `src/app/layout.tsx` (Poppins via `next/font` + `ToastProvider`), `src/app/page.tsx` (Home).
- **new components:** `store-shell` · `app-bottom-nav` · `desktop-nav` · `nav-config` · `add-to-cart-bar` · `cart-view`.
- **new lib:** `lib/mock-data.ts` (typed mock catalog — prices in paise).
- **new routes:** `categories/` · `search/` · `products/[slug]/` · `cart/` · `account/`.

---

## 2. Components built

| Layer | Components |
| --- | --- |
| **Primitives (11)** | Button · Input · SearchBar · Badge · Card · Drawer · Dialog · Toast (+`useToast`) · Skeleton · EmptyState · Spinner |
| **Core app (10)** | AppHeader · BottomNavigation · ProductCard · CategoryCard · CartButton · QuantityStepper · AddressChip · SearchHeader · SectionHeader · StoreStatusBanner |
| **Shell** | AppShell (header → main → bottom nav, responsive) |

- Interactive components are `"use client"`; display components are server-safe.
- Framework-agnostic: links are injected via a `linkComponent` prop (the app passes Next's `Link`), so `packages/ui` has **no Next.js dependency**.

---

## 3. Routes built (Step 5)

| Route | Type | Notes |
| --- | --- | --- |
| `/` | static | Home — search entry, store status, category grid, product sections |
| `/categories` | static | Full category grid |
| `/search` | static (client) | Live mock filter + empty state |
| `/products/[slug]` | dynamic | PDP — hero, price, similar grid, sticky Add-to-cart |
| `/cart` | static (client) | Mock cart lines + bill summary (display only) |
| `/account` | static | Mock profile + menu |

> `/cart` and `/account` are **middleware-protected** (Phase 1B); their UI is built and builds clean, but live viewing requires a Clerk session — so screenshots cover the public routes.

---

## 4. Design tokens (Step 2)

Extracted from the legacy `old-html` `:root` variables; centralized in `packages/ui/src/tokens/*` (TS) and mirrored in `src/styles/theme.css` (Tailwind v4 `@theme`).

- **colors:** brand `#0C831F` (+dark/light/bg), accent `#FF6B00`, danger `#E23744`, info `#1565C0`, warning `#F9A825`, whatsapp; neutrals (ink/muted/surface/border).
- **typography:** Poppins 400–900; size scale (2xs→3xl).
- **spacing** (4px base) · **radius** (sm→2xl/full) · **shadows** (card/pop/nav/brand/sheet) · **breakpoints** (mobile 390 / tablet 768 / desktop 1024) · **z-index** (header→toast).
- Exported as a single `theme` object (`@suplaykart/ui`).

---

## 5. Verification results (Step 6)

```
pnpm install     ✓
pnpm typecheck   ✓  Turbo: 3 successful (@suplaykart/db, @suplaykart/ui, web)
pnpm build       ✓  Turbo: 1 successful — 8 pages, middleware 87.8 kB
```
- Strict TypeScript throughout; **zero type/lint errors**.
- Only output note is a benign Next-internal webpack cache perf hint (not a code/lint/type warning).
- Build route table: `/ /account /cart /categories` (static), `/products/[slug]` (dynamic), `/search` (static client), `/api/*` (dynamic).

---

## 6. Visual review (Step 7) — screenshots summary

Captured with Playwright/Chromium against `next dev`, 4 public routes × 3 viewports (12 PNGs):

| Viewport | Home | Categories | Search | PDP |
| --- | --- | --- | --- | --- |
| **390 (mobile)** | 4-col categories, 2-col products, location header, bottom nav | 3-col grid | search header + 2-col results + active "Search" tab | hero + similar 2-col + sticky Add bar |
| **768 (tablet)** | 6-col categories, 3–4-col products | 4–5-col grid | 3–4-col results | wider hero |
| **1024+ (desktop)** | 8-col categories, 6-col products, **inline top-nav** (bottom nav hidden) | 6-col grid | 4–6-col results | centered max-w-3xl |

**Findings:** no overflow, consistent Poppins typography, clean spacing, working navigation (mobile bottom-nav with active states; desktop top-nav). Faithfully echoes the Zepto/Blinkit q-commerce look with Suplaykart green branding. The dev-only "1 Issue" overlay = an `ECONNRESET` from Playwright closing pages (not an app issue; absent in production).

---

## 7. Out of scope (as required)

No business logic, checkout, order processing, inventory workflows, or admin. No real API calls — all UI runs on typed mock data. Auth/data wiring arrives in Phase 1D.

## 8. Remaining work for Phase 1D

- Wire routes to **real data** (Drizzle DAL → server components / server actions) replacing mock.
- **Auth-aware** account/cart (Clerk session; real user, addresses, orders list).
- Per-category route (`/c/[category]`) + real search (Postgres FTS).
- Cart persistence (server cart) and the **checkout UI** (COD, no gateway) per the blueprint.
- Port remaining legacy screens (PDP variants, wishlist, notifications, address forms) into the design system.
- Loading/skeleton + error boundaries on data routes; image assets to replace emoji.
