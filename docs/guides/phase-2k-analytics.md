# Phase 2K — Analytics Foundation

A supplier-scoped analytics layer over the existing order/inventory/customer
data — no new tables, no new writes, purely read-side aggregation.

## DAL (`packages/db/src/dal/analytics.ts`)

All functions are supplier-scoped (except customer counts, which are global for
the single-tenant store) and return plain typed shapes:

- `getRevenueByDay(db, supplierId, days = 14)` — daily delivered revenue +
  order count via `date_trunc('day', placed_at)`, windowed by
  `now() - (days || ' days')::interval`. Revenue counts **delivered** orders
  only (`filter (where status = 'delivered')`); `orders` counts all placements
  in the window.
- `getOrderStatusBreakdown(db, supplierId)` — count per order status.
- `getTopProducts(db, supplierId, limit = 8)` — product name / quantity /
  revenue from `order_items`, ranked by quantity sold.
- `getCustomerAnalytics(db)` — total customers, new-in-30-days, and repeat
  buyers (users with `count(orders) > 1`).
- `getOperationalMetrics(db, supplierId)` — average order value (paise),
  average items per order (via a `per_order` subquery summing quantities),
  pending orders (not delivered/cancelled), and low-stock line count.
- `getConversionMetrics(db, supplierId)` — active carts, total orders,
  fulfillment rate (`delivered / (delivered + cancelled)`), cancellation rate.

## Admin UI (`/admin/analytics`)

An RSC page that fans out all six queries with `Promise.all`, rendering:

- **Stat grid** — avg order value, avg items/order, fulfillment %,
  cancellation % (danger tone above 20%), customers (+30d hint), repeat
  buyers, active carts, low-stock (danger when non-zero).
- **Revenue bars** — a lightweight CSS bar chart of the last 14 days (no chart
  dependency; heights normalized to the window max).
- **Orders by status** — reusing `OrderStatusBadge`.
- **Top products** — quantity · revenue per product.

Added to the admin nav as **Analytics** (`BarChart3` icon) between Inventory
and Customers. `export const dynamic = "force-dynamic"` — analytics always
reflect live data.

## Tests

`packages/db/test/analytics.test.ts` seeds two delivered orders (a repeat
buyer) plus one cancelled order and asserts revenue-by-day, status breakdown,
top-product ranking, customer/repeat counts, operational metrics (AOV, items
per order), and conversion rates.
