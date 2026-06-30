# Missing Pages — Production-Readiness Gap Analysis

**Audit date:** 2026-06-30 · **Status:** analysis only. Compares the 16 legacy customer screens against what a **production-ready Suplaykart** (customer storefront **+ admin panel**) needs.

## Headline findings

1. **The customer storefront UI is largely covered** (16 screens span home → browse → PDP → search → cart/checkout → orders → account → auth).
2. **The admin panel is 100% missing** — there is **not a single admin screen** in `old-html/`.
3. Several **customer flows are partial** — present as a modal/sub-section but not a full page (order confirmation, returns, reviews, legal content, error states).
4. Some screens exist but are **out of Phase-1 scope** (restaurants, pick & drop) and several **referenced-but-absent** surfaces (wallet, gold membership, referrals).

---

## 1. Customer side — missing / partial

Legend — **Status:** ❌ missing · ⚠️ partial (exists as modal/sub-section, not a full page) · 🔵 exists but **Phase-2**.

| Page | Status | Notes |
| --- | --- | --- |
| **Cart (standalone)** | ⚠️ | Legacy `cart.html` is actually **checkout**; cart + checkout are merged. Decide whether to split `/cart` (edit) from `/checkout` (pay) — recommended for web. |
| **Cart — empty state** | ❌ | No empty-cart variant exists in legacy; design it alongside the cart. |
| **Checkout** | ⚠️ | Present (as `cart.html`) but **no live payment** step (COD/UPI-on-delivery only). |
| **Order Confirmation / "Order Placed"** | ⚠️ | Only a success **modal** exists. Production needs a full confirmation page (`/orders/[id]/confirmation`). |
| **Payment Status (success/failed/pending)** | ❌ | No page. Needed once online payments arrive (Phase-2) — and a "pending COD" state now. |
| **Orders list** | ✅ | Exists inside `/account/orders` (from profile). |
| **Order Details** | ✅ | Served by `tracking.html` → `/orders/[id]`. |
| **Cancel Order flow** | ❌ | Legacy only says "cancel via WhatsApp." No in-app cancel page/flow. |
| **Returns / Refund request** | ❌ | Refunds **list** exists (empty state); no "request a return/refund" flow. |
| **Rate & Review (write)** | ⚠️ | Only a star widget (tracking). No full review-submission page or review history. |
| **Coupons / Offers** | ✅ | Exists (`/account/coupons`). A dedicated `/offers` discovery page is optional. |
| **Help Center / FAQ articles** | ⚠️ | Help hub + FAQ **links** exist; actual FAQ/article content pages missing. |
| **Settings** | ⚠️ | Notification toggles + policies exist; a unified `/account/settings` (language, theme, privacy) is missing. |
| **Legal content pages** (Terms, Privacy, Cancellation, Pick&Drop policy, Licenses) | ❌ | Linked from profile but **no content pages** exist. |
| **About / Contact** | ❌ | Footer references only; no pages. |
| **Error pages** (404, 500, offline, maintenance) | ❌ | None. Required for production. |
| **Store-closed / Holiday** | ⚠️ | Exists as banners (home/cart) only; no standalone scheduled-order page. |
| **Out-of-service / Coming-soon** | ✅ | Two variants exist (consolidate). |
| **Splash / Onboarding** | ⚠️ | Login splash exists; no first-run product tour. |
| **Wallet** | ❌ | Header/restaurant wallet icons reference it; no wallet page. |
| **Gold / Membership** | ❌ | Restaurant "Gold" banner references it; no membership page. |
| **Referral / Invite friends** | ⚠️ | Invite UI in out-of-service; no dedicated referral program page. |
| **Scheduled delivery / slot picker** | ❌ | No slot selection (q-commerce is instant today). |
| **Restaurants module** | 🔵 | Exists; **Phase-2**. |
| **Pick & Drop module** | 🔵 | Exists; **Phase-2**. |

**Phase-1 customer gaps to design new:** Order Confirmation page, in-app Cancel-Order flow, Returns/Refund request, Write-a-Review, Help/FAQ content, Settings, Legal content pages, Error pages (404/500/offline). Plus **desktop/responsive layouts** for every screen (legacy is mobile-only) and **real product imagery**.

---

## 2. Admin side — 100% missing (design from scratch)

No admin screens exist. The following is the **minimum Phase-1 admin set** for the approved scope (single-tenant; products, categories, inventory, orders, users), plus Phase-2 additions.

### Phase-1 admin (build new)

| Admin page | Purpose |
| --- | --- |
| **Admin Login / Auth** | Staff sign-in (separate from customer auth), RBAC gate at `/admin`. |
| **Dashboard** | KPIs: today's orders, revenue, pending orders, low-stock, new users. |
| **Orders** | List + filters (status/date), order detail, **status updates** (confirm/pack/OFD/deliver/cancel), assign rider, refund/cancel. |
| **Products** | List, create/edit (name, brand, description, **variants**, **images**, price/MRP, veg flag, badges, category), enable/disable. |
| **Categories** | Category-tree CRUD (sections → categories → subcategories), ordering, icons. |
| **Inventory** | Stock levels per product/variant, low-stock alerts, stock adjustments, in/out-of-stock toggle. |
| **Users / Customers** | List, detail (orders, addresses), block/unblock, search. |
| **Store Settings** | Store hours, **holiday/closed mode**, serviceable pincodes/areas, delivery & handling fees, free-delivery threshold. |
| **Tax / GST config** | Tax rate / GST slab and tax-inclusive billing mode (checkout shows "GST included"). |

### Phase-2 admin

| Admin page | Purpose |
| --- | --- |
| **Coupons / Offers** | Create/manage coupons (code, type, min order, max discount, validity, usage limits). |
| **Banners / Carousel** | Manage home hero slides, ad banners, spotlight stores. |
| **Notifications / Push** | Compose & send push/WhatsApp campaigns; templates. |
| **Reports / Analytics** | Sales over time, top products/categories, order funnel, customer cohorts. |
| **Dynamic pricing (surge/rain)** | Configure surge & rain surcharges and rules — pricing **engine deferred to Phase-2** per ADR 0001 (Phase-1 may stub the UI only). |
| **Riders / Delivery** | Rider roster, assignment, live tracking, payouts. |
| **Refunds / Cancellations** | Queue + approve/process refunds. |
| **Reviews moderation** | Approve/flag product & delivery reviews. |
| **Roles & Permissions (RBAC)** | Staff roles (owner/admin/ops/support) even within single-tenant. |
| **Restaurants admin** (if module ships) | Restaurant + menu + customization management. |
| **Pick & Drop admin** (if module ships) | Courier jobs, pricing, dispatch. |

> **Note (per approved architecture):** the admin panel lives **inside the same Next.js app under `/admin`** (route group, RBAC-gated), not a separate deployment.

---

## 3. Summary of what must be created vs ported

| Bucket | Count (approx) | Source |
| --- | --- | --- |
| Customer screens **portable** from legacy | ~14 (P1) + 2 (P2) | `old-html/` |
| Customer pages to **design new** (P1) | ~8 (confirmation, cancel, returns, review, help/FAQ, settings, legal, error) | new |
| **Desktop/responsive** variants | every screen | new |
| **Admin** pages (P1) | ~8 | new (100% missing) |
| **Admin** pages (P2) | ~10 | new |

See `migration-plan.md` for completion %, build order, and the Phase-1 / Phase-2 split.
