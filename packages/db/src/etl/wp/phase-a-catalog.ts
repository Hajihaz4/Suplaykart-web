/**
 * Phase A — catalog: WP categories/products/variations → categories,
 * products, product_variants, inventory (real app tables).
 *
 * Decisions honored: vendor categories stay plain categories; draft/private
 * products import as inactive; negative stock clamps to 0.
 */
import { and, eq } from "drizzle-orm";
import type { DB } from "../../client";
import {
  categories,
  inventory,
  products,
  productVariants,
  suppliers,
} from "../../schema";
import type { WpData } from "./wp-load";
import { mapAll, mapPut } from "./target";
import { bump, warn, type PhaseReport } from "./report";
import { prettyLabel, stripHtml, toInt, toPaise, toSlug } from "./util";

/** Untracked-but-instock products get this on-hand quantity (documented). */
export const INSTOCK_DEFAULT_QTY = 100;

async function defaultSupplierId(db: DB): Promise<string> {
  const [s] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.isDefault, true))
    .limit(1);
  if (!s) throw new Error("Target has no default supplier — is this a Suplaykart database?");
  return s.id;
}

/** Depth of a category term (for primary-category tie-breaks). */
function termDepth(d: WpData, termId: string): number {
  let depth = 0;
  let cur: string | undefined = termId;
  const seen = new Set<string>();
  while (cur && cur !== "0" && !seen.has(cur)) {
    seen.add(cur);
    cur = d.termParents.get(cur);
    depth++;
    if (depth > 10) break;
  }
  return depth;
}

export async function runPhaseA(
  db: DB,
  data: WpData,
  report: PhaseReport,
  opts: { limit?: number } = {},
): Promise<void> {
  const supplierId = await defaultSupplierId(db);

  // ── categories (parents before children; adopt-by-slug; skip catch-all) ──
  const catMap = await mapAll(db, "category");
  const catRows = [...data.productCats.values()]
    .map((c) => ({ ...c, term: data.terms.get(c.termId) }))
    .filter((c) => c.term && c.term.slug !== "all-products")
    .sort((a, b) => termDepth(data, a.termId) - termDepth(data, b.termId));

  for (const c of catRows) {
    const slug = toSlug(c.term!.slug, `category-${c.termId}`);
    const parentNewId =
      c.parent !== "0" ? (catMap.get(c.parent) ?? null) : null;
    const existingId = catMap.get(c.termId);
    if (existingId) {
      await db
        .update(categories)
        .set({ name: c.term!.name, parentId: parentNewId })
        .where(eq(categories.id, existingId));
      bump(report, "categories_updated");
      continue;
    }
    // adopt a pre-existing platform category with the same slug
    const [pre] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.supplierId, supplierId), eq(categories.slug, slug)));
    if (pre) {
      catMap.set(c.termId, pre.id);
      await mapPut(db, "category", c.termId, pre.id, "adopted-by-slug");
      bump(report, "categories_adopted");
      continue;
    }
    const [row] = await db
      .insert(categories)
      .values({ supplierId, parentId: parentNewId, name: c.term!.name, slug })
      .returning({ id: categories.id });
    catMap.set(c.termId, row!.id);
    await mapPut(db, "category", c.termId, row!.id);
    bump(report, "categories_inserted");
  }

  // fallback category for the (rare) uncategorized product — resolved
  // eagerly, outside the per-product transactions
  let uncategorizedId: string | null = null;
  {
    const [pre] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.supplierId, supplierId), eq(categories.slug, "uncategorized")));
    if (pre) uncategorizedId = pre.id;
    else {
      const [row] = await db
        .insert(categories)
        .values({ supplierId, name: "Uncategorized", slug: "uncategorized", isActive: false })
        .returning({ id: categories.id });
      uncategorizedId = row!.id;
    }
  }

  // ── products + variants + inventory ──────────────────────────────────────
  const prodMap = await mapAll(db, "product");
  const variantMap = await mapAll(db, "variant");
  const usedSkus = new Set(
    (await db.select({ sku: productVariants.sku }).from(productVariants))
      .map((r) => r.sku)
      .filter((s): s is string => Boolean(s)),
  );

  const wpProducts = [...data.posts.values()].filter((p) => p.type === "product");
  const variationsByParent = new Map<string, typeof wpProducts>();
  for (const v of data.posts.values()) {
    if (v.type !== "product_variation") continue;
    const list = variationsByParent.get(v.parent) ?? [];
    list.push(v);
    variationsByParent.set(v.parent, list);
  }

  let processed = 0;
  for (const p of wpProducts) {
    if (opts.limit && processed >= opts.limit) break;
    processed++;
    const meta = data.postmeta.get(p.id) ?? new Map<string, string>();

    // primary category: yoast primary → deepest term → fallback
    const termIds = [...(data.productTerms.get(p.id) ?? [])].filter(
      (t) => data.terms.get(t)?.slug !== "all-products",
    );
    let primary = data.primaryTerm.get(p.id);
    if (!primary || !catMap.has(primary)) {
      primary = termIds
        .filter((t) => catMap.has(t))
        .sort(
          (a, b) =>
            termDepth(data, b) - termDepth(data, a) ||
            (data.terms.get(a)?.slug ?? "").localeCompare(data.terms.get(b)?.slug ?? ""),
        )[0];
    }
    const categoryId = primary ? catMap.get(primary)! : uncategorizedId!;
    if (!primary) {
      warn(report, `product ${p.id} has no category — assigned Uncategorized`);
      bump(report, "products_uncategorized");
    }

    const isActive = p.status === "publish";
    const attributes: Record<string, unknown> = {
      wcLegacyId: Number(p.id),
      legacyCategories: termIds
        .map((t) => data.terms.get(t)?.slug)
        .filter(Boolean),
    };
    const baseSlug = toSlug(p.name, `product-${p.id}`);

    // All writes for one product (row + variants + inventory + id_map) are
    // atomic: a crash rolls the whole product back, so resume re-runs it
    // cleanly instead of duplicating half-written rows.
    await db.transaction(async (rawTx) => {
      const tx = rawTx as unknown as DB;
      const existingId = prodMap.get(p.id);
      let productId: string;
      const productValues = {
        name: p.title || `Product ${p.id}`,
        description: stripHtml(p.content) ?? stripHtml(p.excerpt),
        categoryId,
        isActive,
        attributes,
      };
      if (existingId) {
        await tx.update(products).set(productValues).where(eq(products.id, existingId));
        productId = existingId;
        bump(report, "products_updated");
      } else {
        let slug = baseSlug;
        const [clash] = await tx
          .select({ id: products.id, attributes: products.attributes })
          .from(products)
          .where(and(eq(products.supplierId, supplierId), eq(products.slug, slug)));
        const clashLegacy = (clash?.attributes as { wcLegacyId?: number } | null)
          ?.wcLegacyId;
        if (clash && clashLegacy === Number(p.id)) {
          // orphan of an earlier crashed run — adopt instead of duplicating
          await tx.update(products).set(productValues).where(eq(products.id, clash.id));
          productId = clash.id;
          prodMap.set(p.id, productId);
          await mapPut(tx, "product", p.id, productId, "adopted-orphan");
          bump(report, "products_adopted_orphan");
        } else {
          if (clash) {
            slug = `${baseSlug}-wc${p.id}`;
            warn(report, `product ${p.id}: slug '${baseSlug}' taken — using '${slug}'`);
            bump(report, "products_slug_suffixed");
          }
          const [row] = await tx
            .insert(products)
            .values({ supplierId, slug, ...productValues })
            .returning({ id: products.id });
          productId = row!.id;
          prodMap.set(p.id, productId);
          await mapPut(tx, "product", p.id, productId);
          bump(report, "products_inserted");
          bump(report, isActive ? "products_active" : "products_inactive");
        }
      }

    // ── variants ────────────────────────────────────────────────────────
    const variations = (variationsByParent.get(p.id) ?? []).sort(
      (a, b) => a.menuOrder - b.menuOrder || Number(a.id) - Number(b.id),
    );
    interface VariantPlan {
      legacyId: string;
      label: string;
      sku: string | null;
      mrp: number;
      price: number;
      sortOrder: number;
      active: boolean;
      stockMeta: Map<string, string>;
    }
    const plans: VariantPlan[] = [];

    if (variations.length === 0) {
      const price = toPaise(meta.get("_price")) ?? toPaise(meta.get("_sale_price"));
      const mrp = toPaise(meta.get("_regular_price")) ?? price;
      if (price == null || mrp == null) {
        warn(report, `product ${p.id}: no numeric price — variant imported inactive at 0`);
        bump(report, "variants_priceless");
      }
      plans.push({
        legacyId: `simple:${p.id}`,
        label: "1 unit",
        sku: (meta.get("_sku") ?? "").trim() || null,
        mrp: mrp ?? 0,
        price: Math.min(price ?? 0, mrp ?? price ?? 0),
        sortOrder: 0,
        active: price != null,
        stockMeta: meta,
      });
    } else {
      let sort = 0;
      for (const v of variations) {
        const vm = data.postmeta.get(v.id) ?? new Map<string, string>();
        const attrs = [...vm.entries()]
          .filter(([k, val]) => k.startsWith("attribute_") && val)
          .map(([, val]) => prettyLabel(val));
        const price = toPaise(vm.get("_price")) ?? toPaise(vm.get("_sale_price"));
        const mrp = toPaise(vm.get("_regular_price")) ?? price;
        if (price == null || mrp == null) {
          warn(report, `variation ${v.id} (product ${p.id}): no numeric price — imported inactive at 0`);
          bump(report, "variants_priceless");
        }
        plans.push({
          legacyId: v.id,
          label: attrs.join(" · ") || v.title || `Option ${sort + 1}`,
          sku: (vm.get("_sku") ?? "").trim() || null,
          mrp: mrp ?? 0,
          price: Math.min(price ?? 0, mrp ?? price ?? 0),
          sortOrder: sort++,
          active: price != null && v.status === "publish",
          stockMeta: vm.size ? vm : meta,
        });
      }
    }

    // default = cheapest active plan (falls back to first)
    const def =
      plans.filter((x) => x.active).sort((a, b) => a.price - b.price)[0] ?? plans[0]!;

    for (const plan of plans) {
      let sku = plan.sku;
      if (sku && usedSkus.has(sku) && !variantMap.has(plan.legacyId)) {
        warn(report, `variant ${plan.legacyId}: sku '${sku}' already used — imported without sku`);
        sku = null;
        bump(report, "variants_sku_dropped");
      }
      const values = {
        label: plan.label,
        sku,
        mrp: plan.mrp,
        price: plan.price,
        isDefault: plan === def,
        sortOrder: plan.sortOrder,
        isActive: plan.active,
      };
      const existingVar = variantMap.get(plan.legacyId);
      let variantId: string;
      if (existingVar) {
        await tx.update(productVariants).set(values).where(eq(productVariants.id, existingVar));
        variantId = existingVar;
        bump(report, "variants_updated");
      } else {
        const [row] = await tx
          .insert(productVariants)
          .values({ productId, ...values })
          .returning({ id: productVariants.id });
        variantId = row!.id;
        variantMap.set(plan.legacyId, variantId);
        await mapPut(tx, "variant", plan.legacyId, variantId);
        if (sku) usedSkus.add(sku);
        bump(report, "variants_inserted");
      }

      // ── inventory ─────────────────────────────────────────────────────
      const sm = plan.stockMeta;
      const managed = sm.get("_manage_stock") === "yes";
      const rawStock = toInt(sm.get("_stock"));
      const status = sm.get("_stock_status") ?? "instock";
      let qty: number;
      if (managed && rawStock != null) {
        qty = Math.max(0, rawStock);
        if (rawStock < 0) bump(report, "stock_clamped_negative");
      } else {
        qty = status === "instock" ? INSTOCK_DEFAULT_QTY : 0;
        if (status === "instock") bump(report, "stock_defaulted_instock");
      }
      const lowStock = Math.max(0, toInt(sm.get("_low_stock_amount")) ?? 0);
      const [inv] = await tx
        .select({ id: inventory.id })
        .from(inventory)
        .where(eq(inventory.variantId, variantId));
      if (inv) {
        await tx
          .update(inventory)
          .set({ quantityOnHand: qty, lowStockThreshold: lowStock })
          .where(eq(inventory.id, inv.id));
      } else {
        await tx.insert(inventory).values({
          variantId,
          supplierId,
          quantityOnHand: qty,
          lowStockThreshold: lowStock,
        });
        bump(report, "inventory_inserted");
      }
    }
    }); // end per-product transaction
  }
  report.notes.push(
    `Untracked in-stock items received quantityOnHand=${INSTOCK_DEFAULT_QTY} (adjust in /admin/inventory after import).`,
    `Vendor categories imported as plain categories (owner decision #1).`,
    `Draft/private products imported inactive (owner decision #5).`,
  );
}
