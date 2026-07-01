# Phase 1L — Testing

**Date:** 2026-07-01 · **Scope:** an automated test suite (Vitest) covering units, the DAL, and the critical cart/order/address/admin flows.
**Result:** ✅ **30 tests / 6 files, all passing** via `pnpm test` (Turbo). typecheck 3/3.

## Setup
- **Vitest** added to `@suplaykart/db` and `@suplaykart/ui` (`test: vitest run`); root `pnpm test` → `turbo run test`; `test` task in `turbo.json`.
- **PGlite harness** (`packages/db/test/harness.ts`): a fresh migrated in-memory Postgres per file + builders (`makeSupplier/Category/Product/User`). Tests hit the real query engine — no mocks of the DB.

## Suites
| File | Kind | Covers |
| --- | --- | --- |
| `unit.test.ts` | unit (pure) | order state machine (`canTransition`/`isCancellable`), delivery pricing |
| `cart.test.ts` | DAL / cart flow | add, increment, count/subtotal/savings, update, remove-on-zero, per-user isolation, clear |
| `orders.test.ts` | DAL / order flow | create+reserve, **oversell rollback**, transitions → deliver (sale + collected + timeline), invalid-transition, **cancel releases stock**, ownership |
| `addresses.test.ts` | DAL / address flow | first-default, promote, update, ownership, delete-default promotion |
| `admin.test.ts` | DAL / server-op | product CRUD, inventory adjust + below-reserved guard, staff status change, block/unblock, settings upsert, audit trail, stats |
| `ui/format.test.ts` | unit | `formatINR`, `discountPct`, `formatDate`, order-status metadata |

## Result
```
pnpm test  (turbo)
  @suplaykart/db:test  → 5 files, 26 tests  passed
  @suplaykart/ui:test  → 1 file,   4 tests  passed
  Tasks: 2 successful
pnpm typecheck → 3/3
```

## Notes
Server actions are thin wrappers (auth + Zod + DAL); their business logic is exercised through the DAL suites, and their validation/redirect paths through the build. The standalone `verify:*` scripts remain for one-shot manual checks; the Vitest suites are the authoritative regression tests. Full-stack E2E (Playwright through Clerk OTP) is deferred to Phase 2 (needs Clerk testing tokens).
