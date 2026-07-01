# Phase 1J — Admin Operations

**Date:** 2026-07-01 · **Scope:** wire mutations into the admin area — CRUD, inventory adjustment, order status, customer block, store settings — all audited and ownership/role-enforced.
**Result:** ✅ full admin operations + `admin_audit_log` (migrated live). typecheck 3/3, build green, admin-ops DAL 13/13 (PGlite).

## Schema
- New **`admin_audit_log`** table (append-only: actor, action, entity, entityId, summary, meta). Migration `0001_nifty_madame_web.sql` **generated + applied to live Neon**.

## Mutation DAL (`packages/db/src/dal/admin-ops.ts`) — every op writes an audit row
- **Products:** `createProduct` (product + default variant + inventory, transactional), `updateProduct`, `setProductActive`, `getProductForEdit`.
- **Categories:** `createCategory`, `updateCategory`, `setCategoryActive`, `getCategoryForEdit`.
- **Inventory:** `adjustInventory` (transactional; **guards against dropping on-hand below reserved**; uses `adjustStock` ledger).
- **Orders:** `adminSetOrderStatus` (wraps the validated `updateOrderStatus` → deliver=sale+collected, cancel=release).
- **Customers:** `setCustomerBlocked`.
- **Settings:** `upsertStoreSettings` (singleton upsert).
- **Audit:** `writeAudit` (composes inside transactions via the `Executor` type) + `listAuditLog`.

## Server actions (`app/admin/actions.ts`) — all `requireAdmin()` + supplier-scoped, Zod-validated, ₹→paise
`setOrderStatusAction`, `adjustInventoryAction`, `toggleCustomerBlockAction`, `createProductAction`/`updateProductAction`/`toggleProductActiveAction`, `createCategoryAction`/`updateCategoryAction`/`toggleCategoryActiveAction`, `saveSettingsAction`.

## UI
- Order detail: **status manager** (only valid next transitions + cancel). Inventory: **per-row adjust** control. Customers: **block/unblock** toggle. Products/Categories: **New** + **Edit** forms (`AdminProductForm`/`AdminCategoryForm`) + show/hide toggle. Settings: **editable form** (`AdminSettingsForm`). Dashboard: **recent activity** from the audit log.

## Verification
```
pnpm typecheck → 3/3   exit 0
pnpm build     → admin CRUD/edit routes ƒ dynamic, exit 0
verify:admin (PGlite, 13 assertions) → exit 0
  product create(+variant+stock)/edit/hide · category create/edit/hide
  inventory adjust + below-reserved guard · order status advance
  customer block · settings upsert · 13 audit rows, actor-attributed
migration 0001 applied to live Neon
```

## Ownership / RBAC
All mutations run behind `requireAdmin()` and are supplier-scoped in the DAL (`WHERE supplier_id`). Order status reuses the tested state machine; stock guard prevents negative availability. Every change is attributed to the acting staff user in `admin_audit_log`.
