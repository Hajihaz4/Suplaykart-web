# Phase 1G — Checkout + Orders (COD)

**Date:** 2026-07-01 · **Scope:** COD / UPI-on-Delivery checkout, transactional order creation with reserve-on-place inventory, the order state machine. **No payment gateway.**
**Result:** ✅ oversell-safe transactional orders, full status lifecycle with inventory effects, checkout UI. typecheck 3/3, build green, order+inventory DAL 21/21 (PGlite), live inventory seeded (18 variants × 50).

## Inventory DAL (`packages/db/src/dal/inventory.ts`)
`listAvailability` · `reserveStock` (atomic conditional UPDATE — 0 rows ⇒ `OutOfStockError`, the oversell guard) · `releaseStock` · `commitSale` · `adjustStock` (admin). Every op appends to `inventory_movements` (audit ledger). Shared `Executor` type lets these compose inside the order transaction.

## Orders DAL (`packages/db/src/dal/orders.ts`)
- **`createOrder`** — one `db.transaction`: load cart → validate address ownership → compute bill (paise) → insert `orders` (`placed`, `payment_status=pending`) → snapshot `order_items` → **reserve every line (all-or-nothing)** → `order_status_history` → clear cart. Any short line throws → the whole order rolls back (no partial orders, no phantom reservations).
- **State machine (§4):** `TRANSITIONS` enforces `placed→confirmed→packed→out_for_delivery→delivered` (+ `→cancelled` before dispatch). `updateOrderStatus` (admin) validates the edge, stamps the timestamp, and applies inventory: **delivered ⇒ `commitSale` + `payment_status=collected`**; **cancelled ⇒ `releaseStock`**.
- **`cancelOrder`** — ownership-enforced customer cancel, only within the cancellable window; releases stock. Returns a typed result (`not_found` / `not_cancellable`).
- **Reads:** `listOrders` (summaries), `getOrderById` (items + timeline + `cancellable`, ownership-enforced). Helpers `canTransition`, `isCancellable`, `deliveryFeeFor`.

## Checkout (`/checkout`)
Server page (`requireCurrentUser` → cart + addresses; empty cart ⇒ redirect `/cart`) + client **`CheckoutForm`**: address picker (default preselected, "add address" CTA when none), payment method (COD / UPI on Delivery), optional instructions, live bill, `placeOrderAction`. Action is Zod-validated, maps domain errors (empty cart / bad address / out of stock) to inline messages, and on success `redirect(/account/orders/{id})` (order area = 1H).

## Verification
```
pnpm typecheck                         → 3/3   exit 0
pnpm build                             → /checkout ƒ dynamic, exit 0
verify:orders (PGlite, 21 assertions)  → exit 0
  create=placed/pending · total · order#· reserve 2 · cart emptied
  OVERSELL: createOrder throws + full rollback (0 reserved, 0 orders)
  transitions confirmed→packed→out_for_delivery→delivered
  deliver ⇒ sale committed (on_hand 10→8) + COD collected + 5 timeline events
  invalid transition (delivered→cancelled) rejected
  cancel ⇒ reserved released (avail restored) · ownership (B⊥A)
live seed: 18 inventory rows, 900 units on-hand
```

## Follow-ups
`/account/orders` + `/account/orders/[id]` (order area) land in **1H**; admin status management in **1J** reuses `updateOrderStatus`.
