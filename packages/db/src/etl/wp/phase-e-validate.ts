/**
 * Phase E — validation: reconcile the target database against the dump.
 * Exits non-zero (throws) when a hard expectation fails; the go/no-go gate
 * before any production cutover.
 */
import { sql } from "drizzle-orm";
import type { DB } from "../../client";
import type { WpData } from "./wp-load";
import { rowsOf } from "./target";
import { bump, warn, type PhaseReport } from "./report";

async function count(db: DB, q: ReturnType<typeof sql>): Promise<number> {
  const r = await db.execute(q);
  return Number((rowsOf(r)[0] as { n?: unknown })?.n ?? 0);
}

export async function runPhaseE(
  db: DB,
  data: WpData,
  report: PhaseReport,
): Promise<{ passed: boolean; failures: string[] }> {
  const failures: string[] = [];
  const expect = (label: string, actual: number, expected: number, exact = true) => {
    report.stats[`${label}_expected`] = expected;
    report.stats[`${label}_actual`] = actual;
    const ok = exact ? actual === expected : actual >= expected;
    if (!ok) failures.push(`${label}: expected ${exact ? "" : ">="}${expected}, got ${actual}`);
  };

  // source-side expectations from the dump
  const wpProducts = [...data.posts.values()].filter((p) => p.type === "product");
  const wpVariations = [...data.posts.values()].filter((p) => p.type === "product_variation");
  const wpCats = [...data.productCats.values()].filter(
    (c) => data.terms.get(c.termId)?.slug !== "all-products",
  );
  const wpCustomers = [...data.users.keys()].filter((id) => {
    const caps = data.usermeta.get(id)?.get("wp_capabilities") ?? "";
    return /"customer";b:1/.test(caps);
  });

  // Phase A — every imported product mapped, with >=1 variant and inventory
  const mappedProducts = await count(
    db,
    sql`select count(*)::int as n from wp_migration.id_map where entity = 'product' and new_id is not null`,
  );
  expect("products_mapped", mappedProducts, wpProducts.length);
  const mappedVariants = await count(
    db,
    sql`select count(*)::int as n from wp_migration.id_map where entity = 'variant' and new_id is not null`,
  );
  const simpleCount = wpProducts.length - new Set(wpVariations.map((v) => v.parent)).size;
  expect("variants_mapped", mappedVariants, simpleCount + wpVariations.length);
  const variantsMissingInventory = await count(
    db,
    sql`select count(*)::int as n from product_variants v
        left join inventory i on i.variant_id = v.id where i.id is null`,
  );
  expect("variants_missing_inventory", variantsMissingInventory, 0);
  const productsWithoutVariant = await count(
    db,
    sql`select count(*)::int as n from products p
        left join product_variants v on v.product_id = p.id where v.id is null`,
  );
  expect("products_without_variant", productsWithoutVariant, 0);
  const catCount = await count(
    db,
    sql`select count(*)::int as n from wp_migration.id_map where entity = 'category' and new_id is not null`,
  );
  expect("categories_mapped", catCount, wpCats.length);

  // Phase C
  const staged = await count(
    db,
    sql`select count(*)::int as n from wp_migration.legacy_customers`,
  );
  expect("customers_staged", staged, wpCustomers.length);

  // Phase D — the corruption math must hold
  const orders = await count(db, sql`select count(*)::int as n from wp_migration.legacy_orders`);
  const delivered = await count(
    db,
    sql`select count(*)::int as n from wp_migration.legacy_orders where status = 'delivered'`,
  );
  const patched = await count(
    db,
    sql`select count(*)::int as n from wp_migration.legacy_orders where source = 'csv-oct22-patch'`,
  );
  report.stats.orders_total = orders;
  report.stats.orders_delivered = delivered;
  report.stats.orders_patched = patched;
  const dbCompleted = [...data.orders.values()].filter((o) => o.status === "wc-completed").length;
  // delivered = intact DB completed + patched blanked + csv-only completed (>= lower bound)
  expect("orders_delivered_lower_bound", delivered, dbCompleted + patched, false);
  const itemless = await count(
    db,
    sql`select count(*)::int as n from wp_migration.legacy_orders o
        where o.status = 'delivered'
          and not exists (select 1 from wp_migration.legacy_order_items i where i.wp_order_id = o.wp_order_id)`,
  );
  report.stats.delivered_orders_without_items = itemless;
  if (itemless > 0)
    warn(report, `${itemless} delivered orders have no line items (source data gap) — review before cutover`);

  const revenue = await count(
    db,
    sql`select coalesce(sum(total), 0)::bigint as n from wp_migration.legacy_orders where status = 'delivered'`,
  );
  report.stats.delivered_revenue_paise = revenue;

  for (const f of failures) {
    warn(report, `EXPECTATION FAILED — ${f}`);
    bump(report, "failures");
  }
  report.notes.push(
    failures.length
      ? `VALIDATION FAILED (${failures.length} expectation(s) unmet).`
      : "All validation expectations met.",
  );
  return { passed: failures.length === 0, failures };
}
