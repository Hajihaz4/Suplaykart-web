# Migration Plan — Legacy `old-html/` → Suplaykart (Next.js)

**Date:** 2026-06-30 · **Status:** plan only — **no code, no Next.js, no migration performed yet.** This document depends on `page-inventory.md`, `component-inventory.md`, and `missing-pages.md`.

Scope follows the approved Phase-1 decision ([ADR 0001](../adr/0001-architecture-and-phase-1-scope.md)): **single-tenant grocery storefront + in-app `/admin`**, products / categories / cart / checkout-UI / orders / users / inventory, **no live payments, no restaurants, no pick & drop, no queues** in Phase 1.

---

## 1. Completion percentage

These are **design-coverage** estimates against a production-ready Suplaykart. The legacy files are **static UI prototypes** — visually rich, but with **zero backend, zero persistence, mobile-only, emoji placeholders**.

| Lens | Complete | Missing | Basis |
| --- | --- | --- | --- |
| **Customer UI — design coverage (all)** | **~75%** | ~25% | 16 screens cover most customer surfaces; gaps = confirmation/cancel/returns/review/help/settings/legal/error + desktop layouts. |
| **Customer UI — Phase-1 scope only** | **~80%** | ~20% | Restaurants/Pick excluded; core grocery + account + auth largely present. |
| **Admin UI** | **0%** | 100% | No admin screens exist at all. |
| **Backend / APIs / data model** | **0%** | 100% | All client-side mock; nothing real. |
| **Responsive (desktop/tablet)** | **0%** | 100% | Every screen is a 390 px mobile shell. |
| **Real assets (images, maps, fonts)** | **~10%** | ~90% | Fonts + design tokens reusable; product/category/restaurant imagery and real maps absent. |

### Blended product completion

> Counting **design + build, customer + admin + backend**, weighted:

- **Overall Suplaykart (production-ready):** **~15–20% complete.** The customer *design layer* is strong, but functionality (0%), admin (0%), backend (0%), and responsive (0%) dominate the remaining work.
- **Phase-1 MVP specifically:** **~20–25% complete** — the customer mobile design is a big head start; everything functional, all of admin, and the backend remain.

**Missing percentage (Phase-1):** **~75–80%** of the work remains (build + admin + backend + responsive).

---

## 2. Migration methodology (3 passes)

Per the `old-html/` rule, treat the legacy files as **read-only ground truth**; never edit them. Port in three passes and log each completed page in this folder.

**Pass 1 — Design extraction (no functional code).** Extract the shared `:root` tokens (colors, Poppins, radii, shadows, motion) into the Tailwind preset + brand tokens. Catalogue the 16 screens (done — see `page-inventory.md`). No images exist to move (emoji/gradients) — flag real-imagery sourcing as a separate task.

**Pass 2 — Component re-creation.** Build `packages/ui` from `component-inventory.md`: the ~14 primitives + ~12 composites **first** (BottomSheet, BottomNav, ProductCard, SearchBar, AppHeader, AddToCartControl, Toast, etc.), then page templates. Verify visual parity against the originals with side-by-side screenshots before marking a page done. **Add desktop/responsive layouts here** (legacy is mobile-only).

**Pass 3 — Data wiring.** Replace mock arrays with real data from the database/API; connect flows (search, cart→checkout, auth, orders). Discard legacy inline vanilla JS in favor of React state / Server Actions / TanStack Query — behavior preserved, implementation modernized.

---

## 3. Recommended build order

Sequenced so each step unblocks the next; foundation and shared UI come before pages.

1. **Foundation** — monorepo scaffold, Tailwind preset from tokens, `packages/ui` primitives, **data-model design first** (products, variants, categories, inventory, orders, users, addresses; single-tenant with a forward-compatible supplier seam per ADR 0001).
2. **Auth + location** — `/login` (phone/OTP), serviceability gate, `/coming-soon` (consolidate the 3 OOS designs).
3. **Catalog read path** — `/` (home), `/categories`, `/products` + `/c/[category]`, `/products/[slug]` (PDP), `/search`. (Wire to real catalog + inventory.)
4. **Account scaffold** — `/account` hub + `/account/{profile,addresses}`, `/account/addresses/new|[id]/edit` (real maps), `/wishlist`.
5. **Cart → checkout → order** — `/cart`, `/checkout` (COD/UPI-on-delivery placeholder, **no live gateway**), order creation, `/orders/[id]` (details + tracking), `/account/orders`, **Order Confirmation page** (new).
6. **Notifications & engagement** — `/notifications` feed + `/account/notifications` settings, `/account/coupons`.
7. **Admin (Phase-1)** — `/admin` (RBAC) → dashboard, products CRUD, categories CRUD, inventory, orders management, users, store settings.
8. **Fill Phase-1 gaps** — cancel-order flow, returns/refund request, write-a-review, help/FAQ content, settings, legal content, error pages (404/500/offline).
9. **Hardening** — responsive polish, accessibility, SEO, performance, empty/loading/error states across the board.

---

## 4. Phase-1 MVP scope

**Customer (port + new):**
- Home `/`, serviceability/coming-soon, Categories, Product listing, PDP, Search.
- Cart → Checkout (COD / UPI-on-delivery, **no live payment**), Order Confirmation (new), Order Details/Tracking, Orders history.
- Account (profile, addresses + add/edit, refunds list), Login (phone/OTP), Wishlist, Notifications feed + settings, Coupons.

**Admin (all new, in-app `/admin`):**
- Login/RBAC, Dashboard, Products CRUD, Categories CRUD, Inventory, Orders management, Users, Store settings (hours/holiday/serviceable areas/fees).

**Backend (per architecture):** Postgres + Drizzle (single-tenant, supplier-ready schema), phone/OTP auth, order + inventory logic, no queues/Redis/Stripe yet.

**Explicitly excluded from Phase-1:** restaurants, pick & drop, live payment gateways (Stripe/Razorpay), wallet, gold membership, referrals, surge/rain pricing engine (UI may stub it), scheduled delivery, async/queue infra, multi-supplier features.

---

## 5. Phase-2 scope

- **Restaurants module** (`/restaurants`, `/restaurants/[id]`, menu + customization) and its admin.
- **Pick & Drop module** (`/pick`) and its dispatch admin.
- **Live payments** (Stripe/Razorpay) + Payment Status pages; wallet; **gold/membership**; **referrals**.
- **Reviews & ratings** (write + moderation), **returns/refunds** processing, **scheduled delivery / slots**.
- **Surge/rain dynamic pricing** engine, **banners/notifications** admin, **reports/analytics**, **riders/delivery** management.
- **Multi-supplier expansion** (activate the supplier seam designed in Phase-1).
- Async infrastructure (queues/Redis) as load demands.

---

## 6. Key migration risks & call-outs

| Risk / gap | Action |
| --- | --- |
| **No real imagery** (emoji/gradients) | Source product/category imagery; treat as a parallel content task. |
| **Mobile-only designs** | Design desktop/tablet layouts in Pass 2 — not a port, net-new work. |
| **Cart & checkout merged** | Decide `/cart` vs `/checkout` split before building step 5. |
| **3 overlapping OOS designs** | Consolidate into one serviceability component with variants. |
| **Profile bundles ~8 screens** | Split into real `/account/*` routes early. |
| **Pricing logic only in mock JS** (surge/rain/coupon/tip/free-delivery) | Design the pricing/bill engine in the data-model phase **before** checkout. |
| **Admin entirely absent** | Budget Phase-1 admin as net-new design + build (~8 screens). |
| **Prototype demo panels & inline JS** | Strip; do not carry into the app. |

---

**Next step (awaiting your go-ahead):** none of the above is built yet. When you approve, the natural first action is **step 1 (foundation + data-model design)** — still documentation/schema, no UI — per the approval-gated workflow.
