# Phase-1 Blueprint — Suplaykart

**Status:** FINAL planning document before implementation. **Planning is frozen.**
**Date:** 2026-06-30 · **Authority:** governed by [ADR 0001](../adr/0001-architecture-and-phase-1-scope.md); informed by `page-inventory.md`, `component-inventory.md`, `missing-pages.md`, `migration-plan.md`.

> This document **defines** the data model and lifecycles only. It contains **no application code, no UI, no components, no Next.js scaffolding**. The schema below is a *specification* (tables/columns/constraints), not a migration file.

## Scope guardrails (Phase-1)

- **Single-tenant** Suplaykart (one store) — but the schema carries a **`supplier_id` seam** on every catalog/inventory/order row so multi-supplier is an additive, non-destructive future migration. **No supplier management is built.**
- **In scope:** storefront catalog, categories, cart, **COD/UPI-on-delivery checkout (no live gateway)**, orders, order tracking, users, inventory, addresses, coupons, notifications, serviceability, wishlist.
- **Excluded (Phase-2):** restaurants, pick & drop, live payments (Stripe/Razorpay), wallet, gold/membership, referrals, **surge/rain pricing engine** (fields exist; engine deferred), scheduled delivery, queues/Redis, product reviews (write), returns processing.

## Conventions

| Convention | Rule |
| --- | --- |
| **Money** | Integer **minor units (paise)**; ₹1 = 100. No floats. Display layer formats. |
| **IDs** | `uuid` primary keys (app- or DB-generated). `order_number` is a separate human code. |
| **Timestamps** | `timestamptz`, UTC. `created_at` / `updated_at` on every table. |
| **Enums** | Postgres enums (or check constraints) as listed per section. |
| **Soft delete** | `is_active` / `is_blocked` flags; hard delete avoided for orders/users. |
| **Snapshots** | Orders snapshot product/price/address at placement (history must not mutate). |
| **Tenancy seam** | `supplier_id` FK → `suppliers` (one default row in Phase-1). |

---

## 1. Database schema (Phase-1)

Format: **Table** → `column` `type` *(constraints)* — notes. FKs and key indexes called out.

### 1.1 Tenancy & identity

**`suppliers`** — the single-tenant seam (seed one "Suplaykart Store" row).
- `id` uuid PK
- `name` text NOT NULL
- `is_default` boolean NOT NULL default false — exactly one true in Phase-1
- `is_active` boolean NOT NULL default true
- `created_at` / `updated_at`
> Phase-1 seeds one default supplier. Catalog/inventory/orders FK to it. No supplier auth/onboarding/payout.

**`users`** — customer **and** staff profiles (identity owned by Clerk; this is the local profile mirror).
- `id` uuid PK
- `clerk_user_id` text UNIQUE NOT NULL — link to Clerk identity
- `phone` text UNIQUE NOT NULL — E.164 (+91…)
- `name` text
- `email` text NULL
- `role` enum `user_role` NOT NULL default `customer` — see §2/§3
- `is_blocked` boolean NOT NULL default false
- `default_address_id` uuid NULL → `addresses.id`
- `created_at` / `updated_at`
- Indexes: unique(`clerk_user_id`), unique(`phone`).

### 1.2 Catalog

**`categories`** — self-referential tree (section → category → subcategory).
- `id` uuid PK · `supplier_id` FK · `parent_id` uuid NULL → `categories.id`
- `name` text · `slug` text — unique per `supplier_id`
- `icon` text NULL (emoji) · `image_url` text NULL
- `sort_order` int default 0 · `is_active` boolean default true
- `created_at` / `updated_at`
- Index: (`supplier_id`,`parent_id`,`sort_order`); unique(`supplier_id`,`slug`).

**`products`**
- `id` uuid PK · `supplier_id` FK · `category_id` FK → `categories.id`
- `name` text · `slug` text (unique per supplier) · `brand` text NULL
- `description` text NULL · `is_veg` boolean NULL (veg/non-veg/egg → enum optional)
- `attributes` jsonb NULL — flexible key-info + nutrition + highlights (variable per product)
- `badges` jsonb NULL — e.g. `["BESTSELLER","NEW"]`
- `rating_avg` numeric(2,1) NULL · `rating_count` int default 0 — denormalized
- `is_active` boolean default true · `created_at` / `updated_at`
- Index: (`supplier_id`,`category_id`,`is_active`); unique(`supplier_id`,`slug`). Full-text search index on `name`/`brand` (Postgres FTS in Phase-1).

**`product_variants`** — the sellable unit (price lives here).
- `id` uuid PK · `product_id` FK
- `label` text — e.g. "52.9 g", "1 kg" · `sku` text UNIQUE NULL
- `mrp` int (paise) · `price` int (paise) — sell price ≤ mrp
- `unit` text NULL · `is_default` boolean default false · `sort_order` int
- `is_active` boolean default true · `created_at` / `updated_at`
- Index: (`product_id`,`sort_order`). Constraint: exactly one `is_default` per product (app-enforced).

**`product_images`**
- `id` uuid PK · `product_id` FK · `variant_id` uuid NULL → `product_variants.id`
- `url` text · `alt` text NULL · `sort_order` int · `created_at`

### 1.3 Inventory

**`inventory`** — 1:1 with variant (single warehouse in Phase-1).
- `id` uuid PK · `variant_id` FK UNIQUE → `product_variants.id` · `supplier_id` FK
- `quantity_on_hand` int NOT NULL default 0
- `quantity_reserved` int NOT NULL default 0
- `low_stock_threshold` int NOT NULL default 0
- `updated_at`
- **Derived:** `available = quantity_on_hand − quantity_reserved` (never < 0).
- Constraint: `quantity_on_hand >= 0`, `quantity_reserved >= 0`, `quantity_reserved <= quantity_on_hand`.

**`inventory_movements`** — append-only ledger (audit + reconciliation).
- `id` uuid PK · `variant_id` FK · `supplier_id` FK
- `type` enum `inventory_movement_type` — `restock | reserve | release | sale | adjust | return`
- `quantity_delta` int — signed
- `reason` text NULL · `order_id` uuid NULL → `orders.id`
- `actor_user_id` uuid → `users.id` — **required (NOT NULL) for `restock`/`adjust`** (admin accountability); NULL only for system movements (`reserve`/`release`/`sale`)
- `created_at`
- Index: (`variant_id`,`created_at`), (`order_id`).

### 1.4 Addresses

**`addresses`**
- `id` uuid PK · `user_id` FK
- `label` enum `address_label` — `home | work | other` · `custom_label` text NULL
- `recipient_name` text NULL · `recipient_phone` text NULL (order-for-someone-else)
- `house` text · `floor` text NULL · `area` text · `landmark` text NULL
- `pincode` text · `city` text · `state` text
- `lat` numeric NULL · `lng` numeric NULL
- `is_default` boolean default false · `is_active` boolean default true
- `created_at` / `updated_at`
- Index: (`user_id`,`is_active`).

### 1.5 Cart & wishlist

**`carts`** — one active cart per user (server-persisted for cross-device).
- `id` uuid PK · `user_id` FK UNIQUE · `created_at` / `updated_at`

**`cart_items`**
- `id` uuid PK · `cart_id` FK · `variant_id` FK
- `quantity` int NOT NULL (≥1) · `added_at`
- Unique(`cart_id`,`variant_id`). *(Price resolved live from variant; captured at order placement.)*

**`wishlist_items`**
- `id` uuid PK · `user_id` FK · `variant_id` FK (or `product_id`)
- `created_at` · Unique(`user_id`,`variant_id`).

### 1.6 Coupons

**`coupons`**
- `id` uuid PK · `code` text UNIQUE · `type` enum `coupon_type` — `percent | flat`
- `value` int — percent (1–100) or paise · `min_order_amount` int (paise) NULL
- `max_discount_amount` int (paise) NULL · `valid_from` / `valid_to` timestamptz
- `usage_limit` int NULL (global) · `per_user_limit` int NULL
- `is_active` boolean default true · `created_at` / `updated_at`

**`coupon_redemptions`**
- `id` uuid PK · `coupon_id` FK · `user_id` FK · `order_id` FK
- `discount_amount` int (paise) · `redeemed_at`
- Index: (`coupon_id`,`user_id`).

> **Coupon handling (Phase-1):** coupon **redemption + validation** are Phase-1; the **admin coupon-creation UI is Phase-2** (`/admin/coupons`). For Phase-1 launch/testing, coupons are created via **DB seed / migration (manual SQL)** — e.g. the legacy `WELCOME10`, `NAGORE40`.

### 1.7 Orders

**`orders`**
- `id` uuid PK · `order_number` text UNIQUE — human code `SP-XXXXXX`
- `user_id` FK · `supplier_id` FK
- `status` enum `order_status` — see §4
- `payment_method` enum `payment_method` — `cod | upi_on_delivery`
- `payment_status` enum `payment_status` — `pending | collected | refunded | failed` *(Phase-1 uses only `pending`→`collected`; `refunded`/`failed` are reserved stubs for Phase-2)*
- **Address snapshot:** `delivery_address` jsonb (frozen copy) · `address_id` uuid NULL → `addresses.id`
- **Bill (all paise):** `subtotal`, `item_discount`, `coupon_discount`, `delivery_fee`, `handling_fee`, `surge_fee` (P2, default 0), `rain_fee` (P2, default 0), `tip_amount`, `donation_amount`, `tax_amount` (GST, informational/inclusive), `total_amount`, `savings_total`
- `coupon_id` uuid NULL → `coupons.id`
- `delivery_instructions` jsonb NULL (chips/custom)
- **Timeline stamps:** `placed_at`, `confirmed_at`, `packed_at`, `out_for_delivery_at`, `delivered_at`, `cancelled_at`
- `cancel_reason` text NULL · `cancelled_by` enum `actor_type` NULL (`customer|staff|system`)
- `created_at` / `updated_at`
- Index: (`user_id`,`created_at`), (`status`), unique(`order_number`).

**`order_items`** — snapshotted.
- `id` uuid PK · `order_id` FK · `variant_id` uuid NULL → `product_variants.id`
- `product_name` text (snapshot) · `variant_label` text (snapshot) · `is_veg` boolean (snapshot)
- `unit_price` int (paise, snapshot) · `quantity` int · `line_total` int (paise)
- `created_at`

**`order_status_history`** — drives the tracking timeline.
- `id` uuid PK · `order_id` FK · `status` enum `order_status`
- `note` text NULL · `actor` enum `actor_type` (`system|customer|staff`) · `actor_user_id` uuid NULL
- `created_at` · Index: (`order_id`,`created_at`).

**`order_ratings`** — post-delivery rating (Phase-1; product reviews are Phase-2).
- `id` uuid PK · `order_id` FK UNIQUE · `user_id` FK
- `rating` int (1–5) · `comment` text NULL · `created_at`

### 1.8 Store, serviceability & engagement

**`store_settings`** — singleton per supplier.
- `id` uuid PK · `supplier_id` FK UNIQUE
- `is_open` boolean default true · `holiday_mode` boolean default false · `holiday_note` text NULL
- `store_hours` jsonb (per-day open/close)
- `delivery_fee` int (paise) · `handling_fee` int (paise) · `free_delivery_threshold` int (paise)
- `tax_inclusive` boolean default true · `gst_rate` numeric NULL — GST-inclusive pricing
- `updated_at`

**`serviceable_areas`** — drives serviceability gate / coming-soon / pincode checker.
- `id` uuid PK · `supplier_id` FK · `pincode` text · `city` text · `area_name` text NULL
- `status` enum `service_status` — `live | coming_soon` · `expected_launch` text NULL
- `is_active` boolean default true · `created_at`
- Unique(`supplier_id`,`pincode`).

**`waitlist_signups`** — out-of-service "notify me".
- `id` uuid PK · `phone` text · `city` text NULL · `pincode` text NULL · `interests` jsonb NULL · `created_at`

**`notifications`**
- `id` uuid PK · `user_id` FK
- `type` enum `notification_type` — `order | delivery | offer | store | account | refund | weather`
- `title` text · `body` text · `data` jsonb NULL (order_id / coupon code)
- `is_read` boolean default false · `is_pinned` boolean default false · `created_at`
- Index: (`user_id`,`created_at`).

**`notification_preferences`** — toggles from account.
- `id` uuid PK · `user_id` FK UNIQUE
- `whatsapp` / `push` / `promotional` / `store_status` booleans default true · `updated_at`

### 1.9 Relationship summary

```
suppliers 1─* categories 1─* products 1─* product_variants 1─1 inventory
                                          product_variants 1─* product_images
                                          product_variants 1─* inventory_movements
users 1─* addresses        users 1─1 carts 1─* cart_items *─1 product_variants
users 1─* wishlist_items   users 1─1 notification_preferences  users 1─* notifications
users 1─* orders 1─* order_items
orders 1─* order_status_history     orders 1─1 order_ratings
coupons 1─* coupon_redemptions *─1 orders
suppliers 1─1 store_settings        suppliers 1─* serviceable_areas
```

---

## 2. User roles (customer side)

| Role | State | Capabilities |
| --- | --- | --- |
| **guest** | unauthenticated | Browse catalog, categories, search, PDP, view serviceability/coming-soon. **Cannot** add to cart, checkout, or access account. |
| **customer** | authenticated (`users.role = customer`) | Everything guest can, **plus** cart, wishlist, checkout (COD/UPI-on-delivery), place/track/cancel (within window) orders, manage addresses & profile, view coupons, notifications, rate delivered orders, delete account. |

- Default role on first login = `customer`.
- A user is scoped to **their own** data (orders/addresses/cart/wishlist) — enforced at the query layer (every customer query filters by `user_id`).

---

## 3. Admin roles (staff RBAC)

Staff are `users` rows with an elevated `role`. The `/admin` area requires any staff role; capabilities follow this matrix.

| Resource / Action | owner | admin | ops | support |
| --- | :---: | :---: | :---: | :---: |
| Dashboard (view) | ✅ | ✅ | ✅ | ✅ |
| Orders — view | ✅ | ✅ | ✅ | ✅ |
| Orders — update status / cancel / assign | ✅ | ✅ | ✅ | ❌ |
| Products — view | ✅ | ✅ | ✅ | ✅ |
| Products — create/edit/disable | ✅ | ✅ | ❌ | ❌ |
| Categories — manage | ✅ | ✅ | ❌ | ❌ |
| Inventory — adjust / restock | ✅ | ✅ | ✅ | ❌ |
| Users — view | ✅ | ✅ | ✅ | ✅ |
| Users — block/unblock | ✅ | ✅ | ❌ | ❌ |
| Store settings (hours/holiday/fees/tax/areas) | ✅ | ✅ | ❌ | ❌ |
| Manage staff & roles | ✅ | ❌ | ❌ | ❌ |

- `user_role` enum (full): `customer | support | ops | admin | owner`.
- Enforcement: **defense-in-depth** — middleware gate on `/admin` (role claim in session) **plus** server-side re-check on every admin mutation. Roles are **data, not code**.
- Phase-1 is single-tenant: roles are global (not per-supplier). The supplier seam leaves room to scope roles per supplier later.

---

## 4. Order lifecycle

**States (`order_status`):** `placed → confirmed → packed → out_for_delivery → delivered`; plus `cancelled` (terminal). (`returned` is Phase-2.)

```
            ┌───────────── cancelled ─────────────┐  (terminal)
            │            │           │            │
        placed ──▶ confirmed ──▶ packed ──▶ out_for_delivery ──▶ delivered (terminal)
```

| Transition | Trigger / actor | Side effects |
| --- | --- | --- |
| → **placed** | Customer places order | Reserve inventory (atomic, §5); snapshot items + address; `payment_status = pending`; history(placed); notification. |
| placed → **confirmed** | Staff (or auto) accepts | `confirmed_at`; history; notification. |
| confirmed → **packed** | Staff | `packed_at`; history. |
| packed → **out_for_delivery** | Staff (rider assigned) | `out_for_delivery_at`; history; notification. |
| out_for_delivery → **delivered** | Staff/rider | `delivered_at`; **finalize sale** (§5); COD → `payment_status = collected`; history; trigger rating prompt. |
| any pre-delivery → **cancelled** | Customer (within 5-min window) or Staff (any time pre-delivery) | `cancelled_at`, `cancelled_by`, `cancel_reason`; **release inventory** (§5); **COD and UPI-on-delivery are both uncollected pre-delivery → no money moved** (`payment_status` stays `pending`; no refund needed — refund flow is Phase-2); history; notification. |

- **Cancellation window:** customer self-cancel allowed only while within **5 minutes** of `placed_at` **and** status ∈ {placed, confirmed}. Outside that, cancellation is staff-only (legacy "cancel via WhatsApp" becomes an in-app + staff flow).
- **Guards:** an order cannot be placed when the store `is_open = false` / `holiday_mode = true` (closed banner; no scheduling in Phase-1) or when the delivery address pincode is not `live` in `serviceable_areas`.
- **Allowed transitions are validated server-side**; illegal transitions rejected. Every transition writes `order_status_history` (the tracking timeline).

---

## 5. Inventory lifecycle

**Quantities per variant:** `on_hand`, `reserved`, `available = on_hand − reserved`.
**Stock status (derived):** `in_stock` (available > threshold) · `low_stock` (0 < available ≤ threshold) · `out_of_stock` (available ≤ 0).

| Event | Source | Effect | Ledger `type` |
| --- | --- | --- | --- |
| **Restock** | Admin | `on_hand += q` | `restock` |
| **Manual adjust** | Admin | `on_hand += Δ` (signed) | `adjust` |
| **Order placed** | Checkout | `reserved += q` **iff** `available ≥ q` (atomic) | `reserve` |
| **Order cancelled** (pre-delivery) | Order lifecycle | `reserved −= q` | `release` |
| **Order delivered** | Order lifecycle | `on_hand −= q`, `reserved −= q` | `sale` |
| **Return** *(P2)* | Returns flow | `on_hand += q` | `return` |

- **Oversell prevention (load-bearing):** reservation is an **atomic conditional update** —
  `UPDATE inventory SET reserved = reserved + :q, updated_at = now() WHERE variant_id = :id AND (on_hand − reserved) >= :q` — succeeds only if stock is available; the whole order placement is one transaction (all items reserve or the order fails).
- **Out-of-stock variants** cannot be added to cart or ordered; the storefront shows availability from `available`.
- **Every quantity change appends an `inventory_movements` row** (audit + reconciliation), linked to `order_id` where relevant.
- **Accountability:** admin movements (`restock`/`adjust`) record the acting staff's `actor_user_id`; system movements (`reserve`/`release`/`sale`) record NULL actor.

---

## 6. COD checkout lifecycle

*(COD / UPI-on-delivery only — **no live payment gateway** in Phase-1; online payment is disabled "coming soon".)*

1. **Cart review** (`/cart`) — items, qty edits, remove, move-to-wishlist; live subtotal.
2. **Checkout** (`/checkout`) — requires authenticated customer:
   - Select/confirm **delivery address**; verify pincode is `live` in `serviceable_areas`.
   - **Store-open guard** — if `is_open=false`/`holiday_mode` → block placement (show closed banner).
   - **Bill computation** (all paise):
     `subtotal` (Σ variant price × qty) − `item_discount` (MRP→price) − `coupon_discount` (validated: active, within dates, min-order met, max-cap, usage/per-user limits) + `delivery_fee` (waived if `subtotal ≥ free_delivery_threshold`) + `handling_fee` + `surge_fee`/`rain_fee` *(P2, 0)* + `tip_amount` + `donation_amount` = `total_amount`. **GST is inclusive** (`tax_amount` informational). `savings_total` = item discount + coupon + waived delivery.
   - Choose **delivery instructions** (chips/custom) and **payment method** (`cod` | `upi_on_delivery`).
3. **Place order** (single DB transaction):
   - Validate: cart non-empty, address serviceable, store open, coupon valid, prices current.
   - **Reserve inventory atomically** for every line (§5) — fail → surface "out of stock" and abort.
   - Create `orders` (`status=placed`, `payment_status=pending`, `order_number`) + snapshotted `order_items` + `order_status_history(placed)` + `coupon_redemptions` (if used); clear `cart_items`; emit notification.
4. **Order confirmation** (`/orders/[id]/confirmation`) — success page (legacy had only a modal; production page added).
5. **Fulfillment** — staff drives `confirmed → packed → out_for_delivery → delivered` (§4); customer tracks at `/orders/[id]`.
6. **Payment collection** — cash/UPI collected **on delivery**; on `delivered` → `payment_status = collected`.
7. **Cancellation** — within the 5-min window (customer) or by staff (§4) → release inventory; both COD and UPI-on-delivery are uncollected pre-delivery, so **no refund is needed** (`payment_status` stays `pending`; refund flow is Phase-2).

> **Open item flagged earlier:** "checkout without a gateway" is realized as **order with `payment_status = pending`, collected at delivery**. Online capture + Payment-Status pages are Phase-2.

---

## 7. Authentication lifecycle

**Identity provider:** **Clerk** (per ADR 0001), using **phone number + SMS OTP**. A local `users` row mirrors the Clerk identity (`clerk_user_id`) and owns app data + `role`.

1. **Browse as guest** — catalog/search/PDP are public; serviceability gate may show coming-soon.
2. **Auth required** to add-to-cart / checkout / account → redirect to `/login`.
3. **Phone entry** — country `+91`, 10-digit; request OTP (**SMS via Clerk**).
4. **OTP verify** — 6-digit; **resend after 30s**; rate-limited; bounded attempts (lockout/backoff).
5. **Session issued** (Clerk) — on first login, **upsert** local `users` (`clerk_user_id`, `phone`, default `role=customer`); capture name on first run.
6. **Location/serviceability step** — capture or pick a delivery address (map/pincode); check `serviceable_areas`. Out-of-service → `/coming-soon` + waitlist.
7. **Authorization** — session JWT carries a **role claim**; middleware protects `/account`, `/cart`, `/checkout`, and **`/admin`** (staff roles only); every mutation re-checks server-side.
8. **Logout** — clear session. **Delete account** — soft-delete/anonymize the local profile + revoke Clerk identity (legacy "delete via WhatsApp" → in-app + confirmation); flagged for the GDPR/PII runbook.

> **Deferred (Phase-2):** **WhatsApp OTP** delivery (legacy offered it; Phase-1 uses Clerk SMS OTP to stay lean), social logins, multi-device management UI.

---

## 8. Final route structure

`[P1]` = build in Phase-1 · `[P2]` = deferred. Admin lives **inside the same app under `/admin`** (RBAC-gated), per ADR 0001.

### Customer (storefront)

```
/                              Home (serviceability-gated; renders out-of-service state)   [P1]
/coming-soon                   Out-of-service / waitlist (consolidates 3 legacy designs)   [P1]
/login                         Phone + OTP auth, then location                              [P1]
/categories                    Category tree browse                                         [P1]
/products                      All-products listing                                         [P1]
/c/[category]                  Category product listing                                     [P1]
/products/[slug]               Product detail (PDP)                                         [P1]
/search                        Search + faceted filters                                     [P1]
/wishlist                      Saved items                                                  [P1]
/cart                          Cart review                                                  [P1]
/checkout                      Address + bill + COD/UPI-on-delivery + place order           [P1]
/orders/[orderId]              Order details + live tracking                                [P1]
/orders/[orderId]/confirmation Order-placed confirmation (new; legacy had modal only)       [P1]
/notifications                 Notification feed                                            [P1]
/account                       Account hub                                                  [P1]
/account/orders                Order history                                                [P1]
/account/addresses             Address book (list)                                          [P1]
/account/addresses/new         Add address (map + form)                                     [P1]
/account/addresses/[id]/edit   Edit address                                                 [P1]
/account/profile               Edit profile / delete account                                [P1]
/account/coupons               Coupons (apply / available / used)                           [P1]
/account/refunds               Refunds list (empty in Phase-1)                              [P1]
/account/notifications         Notification settings (toggles)                              [P1]
/account/help                  Help & support (WhatsApp + FAQ links)                        [P1]
/account/policies              Terms / privacy / cancellation / licenses                    [P1]
/404, /500, /offline           Error / fallback states                                      [P1]
/restaurants, /restaurants/[id]   Restaurants module                                        [P2]
/pick                          Pick & Drop module                                           [P2]
```

### Admin (`/admin`, staff RBAC)

```
/admin                         Dashboard (KPIs: orders, revenue, low-stock, new users)      [P1]
/admin/orders                  Orders list + filters                                        [P1]
/admin/orders/[id]             Order detail + status updates / cancel                       [P1]
/admin/products                Products list                                                [P1]
/admin/products/new            Create product (+variants, images, pricing)                  [P1]
/admin/products/[id]           Edit product                                                 [P1]
/admin/categories              Category-tree CRUD                                           [P1]
/admin/inventory               Stock levels, low-stock, restock/adjust                      [P1]
/admin/users                   Customers list                                               [P1]
/admin/users/[id]              Customer detail / block-unblock                              [P1]
/admin/settings                Store hours, holiday mode, fees, tax/GST, serviceable areas  [P1]
/admin/staff                   Manage staff & roles (owner only)                            [P1]
/admin/coupons                 Coupons management                                           [P2]
/admin/banners                 Home banners / carousel / spotlight                          [P2]
/admin/notifications           Push/WhatsApp campaigns                                       [P2]
/admin/reports                 Analytics                                                     [P2]
/admin/riders                  Rider roster / assignment                                     [P2]
/admin/pricing                 Surge/rain dynamic pricing config                             [P2]
```

### Server surface (no UI)

```
/api/webhooks/clerk            Clerk identity webhook (user sync)                           [P1]
Server Actions                 First-party mutations: cart, checkout/place-order,           [P1]
                               address CRUD, admin CRUD (Zod-validated, RBAC re-checked)
```

---

## Implementation guardrails (carry into build)

1. **Design-first:** this schema + lifecycles are reviewed/approved **before** any code.
2. **Single transaction** for order placement (reserve-all-or-fail); **atomic** inventory reservation (no oversell).
3. **Snapshots** on orders (items/price/address) — history is immutable.
4. **Supplier seam present, supplier features absent.**
5. **No** Stripe / Redis / queues / restaurants / pick / surge engine in Phase-1 (fields/routes may exist as stubs).
6. **RBAC** enforced in middleware **and** per-mutation server checks.

**This is the final planning artifact. Implementation begins only on your explicit go-ahead.**
