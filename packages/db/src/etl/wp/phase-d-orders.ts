/**
 * Phase D — orders: merged read-only history → wp_migration.legacy_orders.
 *
 * Merge sources (authoritative → patch):
 *  1. DB rows (wp_wc_orders) with status wc-completed / wc-cancelled.
 *  2. The 4,9xx corruption-blanked DB rows whose real data survives in the
 *     Oct-22 CSV export ('csv-oct22-patch').
 *  3. Orders present only in the CSVs (purged from the DB) ('csv-only').
 *
 * True abandonments (blanked rows with no completed CSV record) are skipped.
 * Guest orders import unlinked (wp_customer_id NULL, owner decision #3).
 */
import path from "node:path";
import os from "node:os";
import { sql } from "drizzle-orm";
import type { DB } from "../../client";
import type { WpData } from "./wp-load";
import { parseCsv } from "./csv";
import { bump, warn, type PhaseReport } from "./report";
import { toPaise, toUtcDate } from "./util";

const OCT22 = "local_file_1761106625_order_export_2025-10-22-04-08-14.csv";
const DEC15 = "order_export_2025-12-15-11-42-48.csv";

function csvDir(): string {
  const ws = process.env.WP_WORKSPACE ?? path.join(os.homedir(), "Suplaykart-Migration");
  return path.join(ws, "raw-csv");
}

function mapStatus(raw: string): "delivered" | "cancelled" | null {
  if (raw === "wc-completed" || raw === "completed") return "delivered";
  if (raw === "wc-cancelled" || raw === "cancelled") return "cancelled";
  return null;
}

function mapPayment(raw: string | null | undefined): "cod" | "upi_on_delivery" {
  const s = (raw ?? "").toLowerCase();
  return s.includes("upi") ? "upi_on_delivery" : "cod";
}

interface LegacyItem {
  wpItemId: number | null;
  name: string;
  wpProductId: number | null;
  wpVariationId: number | null;
  qty: number;
  subtotal: number | null;
  total: number;
}

interface LegacyOrder {
  wpId: number;
  source: "db" | "csv-oct22-patch" | "csv-only";
  statusRaw: string;
  status: "delivered" | "cancelled";
  currency: string | null;
  subtotal: number | null;
  deliveryFee: number | null;
  total: number;
  paymentRaw: string | null;
  payment: "cod" | "upi_on_delivery";
  customerWpId: number | null;
  billing: unknown;
  shipping: unknown;
  note: string | null;
  placedAt: Date | null;
  items: LegacyItem[];
}

/** Line items for a CSV row using the structured "Product Item N *" columns. */
function csvItems(row: Record<string, string>, report: PhaseReport): LegacyItem[] {
  const items: LegacyItem[] = [];
  for (let n = 1; n <= 96; n++) {
    const name = row[`Product Item ${n} Name`];
    if (name === undefined) break;
    if (!name.trim()) continue;
    const qty = Number(row[`Product Item ${n} Quantity`] || "1");
    const total = toPaise(row[`Product Item ${n} Total`]);
    if (total == null || !Number.isFinite(qty) || qty <= 0) {
      warn(report, `csv order ${row.order_id}: unparseable line ${n} — skipped`);
      bump(report, "csv_items_unparseable");
      continue;
    }
    items.push({
      wpItemId: null,
      name: name.trim(),
      wpProductId: Number(row[`Product Item ${n} id`]) || null,
      wpVariationId: null,
      qty: Math.trunc(qty),
      subtotal: toPaise(row[`Product Item ${n} Subtotal`]),
      total,
    });
  }
  return items;
}

function fromCsvRow(
  row: Record<string, string>,
  source: "csv-oct22-patch" | "csv-only",
  report: PhaseReport,
): LegacyOrder | null {
  const status = mapStatus(row.status ?? "");
  if (!status) return null;
  const total = toPaise(row.order_total);
  if (total == null) {
    warn(report, `csv order ${row.order_id}: no total — skipped`);
    return null;
  }
  const billing = {
    firstName: row.billing_first_name || null,
    lastName: row.billing_last_name || null,
    phone: row.billing_phone || null,
    address1: row.billing_address_1 || null,
    address2: row.billing_address_2 || null,
    city: row.billing_city || null,
    state: row.billing_state || null,
    pincode: row.billing_postcode || null,
  };
  return {
    wpId: Number(row.order_id),
    source,
    statusRaw: row.status!,
    status,
    currency: row.order_currency || null,
    subtotal: toPaise(row.order_subtotal),
    deliveryFee: toPaise(row.shipping_total),
    total,
    paymentRaw: row.payment_method_title || row.payment_method || null,
    payment: mapPayment(row.payment_method_title || row.payment_method),
    customerWpId: Number(row.customer_id || row.customer_user || "0") || null,
    billing,
    shipping: null,
    note: row.customer_note || null,
    placedAt: toUtcDate(row.order_date ?? null),
    items: csvItems(row, report),
  };
}

export async function runPhaseD(
  db: DB,
  data: WpData,
  report: PhaseReport,
): Promise<void> {
  const oct22 = parseCsv(path.join(csvDir(), OCT22));
  const dec15 = parseCsv(path.join(csvDir(), DEC15));
  const oct22ById = new Map(oct22.map((r) => [r.order_id!, r]));
  const dec15Ids = new Set(dec15.map((r) => r.order_id!));

  // group DB line items by order
  const itemsByOrder = new Map<string, LegacyItem[]>();
  for (const it of data.orderItems) {
    const m = data.orderItemMeta.get(it.itemId) ?? new Map<string, string>();
    const qty = Number(m.get("_qty") ?? "1") || 1;
    const total = toPaise(m.get("_line_total"));
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push({
      wpItemId: Number(it.itemId),
      name: it.name,
      wpProductId: Number(m.get("_product_id")) || null,
      wpVariationId: Number(m.get("_variation_id")) || null,
      qty: Math.trunc(qty),
      subtotal: toPaise(m.get("_line_subtotal")),
      total: total ?? 0,
    });
    itemsByOrder.set(it.orderId, list);
  }

  const plans: LegacyOrder[] = [];

  // 1+2: DB orders (intact) and blanked rows patched from the Oct-22 CSV
  for (const [id, o] of data.orders) {
    const st = mapStatus(o.status);
    if (st) {
      const total = toPaise(o.total);
      if (total == null) {
        warn(report, `db order ${id}: no total — skipped`);
        continue;
      }
      const addr = data.orderAddresses.get(id) ?? {};
      plans.push({
        wpId: Number(id),
        source: "db",
        statusRaw: o.status,
        status: st,
        currency: o.currency,
        subtotal: null,
        deliveryFee: null,
        total,
        paymentRaw: o.paymentMethodTitle ?? o.paymentMethod,
        payment: mapPayment(o.paymentMethodTitle ?? o.paymentMethod),
        customerWpId: Number(o.customerId) || null,
        billing: addr.billing ?? null,
        shipping: addr.shipping ?? null,
        note: o.customerNote,
        placedAt: toUtcDate(o.dateCreated),
        items: itemsByOrder.get(id) ?? [],
      });
      bump(report, "orders_from_db");
    } else if (o.status === "pending") {
      const csvRow = oct22ById.get(id);
      if (csvRow && csvRow.status === "completed") {
        const plan = fromCsvRow(csvRow, "csv-oct22-patch", report);
        if (plan) {
          // prefer surviving DB line items over CSV reconstruction
          const dbItems = itemsByOrder.get(id);
          if (dbItems?.length) plan.items = dbItems;
          plans.push(plan);
          bump(report, "orders_patched_from_oct22");
        }
      } else {
        bump(report, "orders_abandoned_skipped");
      }
    } else {
      bump(report, "orders_other_status_skipped"); // trash etc.
    }
  }

  // 3: CSV-only orders (purged from the DB)
  const dbIds = new Set(data.orders.keys());
  for (const row of oct22) {
    if (dbIds.has(row.order_id!)) continue;
    const plan = fromCsvRow(row, "csv-only", report);
    if (plan) {
      plans.push(plan);
      bump(report, "orders_csv_only");
    }
  }
  for (const row of dec15) {
    if (dbIds.has(row.order_id!) || oct22ById.has(row.order_id!)) continue;
    const plan = fromCsvRow(row, "csv-only", report);
    if (plan) {
      plans.push(plan);
      bump(report, "orders_csv_only");
    }
  }
  void dec15Ids;

  // upsert into staging (idempotent by wp_order_id); each order's row + item
  // replacement is atomic so a crash never leaves an item-less order behind
  for (const p of plans) {
    await db.transaction(async (rawTx) => {
      const tx = rawTx as unknown as DB;
      await tx.execute(sql`
        insert into wp_migration.legacy_orders
          (wp_order_id, order_number, source, status_raw, status, currency,
           subtotal, delivery_fee, total, payment_method_raw, payment_method,
           wp_customer_id, billing, shipping, customer_note, placed_at, item_count)
        values
          (${p.wpId}, ${"WC-" + p.wpId}, ${p.source}, ${p.statusRaw}, ${p.status},
           ${p.currency}, ${p.subtotal}, ${p.deliveryFee}, ${p.total},
           ${p.paymentRaw}, ${p.payment}, ${p.customerWpId},
           ${p.billing ? JSON.stringify(p.billing) : null}::jsonb,
           ${p.shipping ? JSON.stringify(p.shipping) : null}::jsonb,
           ${p.note}, ${p.placedAt}, ${p.items.length})
        on conflict (wp_order_id) do update set
          source = excluded.source, status_raw = excluded.status_raw,
          status = excluded.status, currency = excluded.currency,
          subtotal = excluded.subtotal, delivery_fee = excluded.delivery_fee,
          total = excluded.total,
          payment_method_raw = excluded.payment_method_raw,
          payment_method = excluded.payment_method,
          wp_customer_id = excluded.wp_customer_id,
          billing = excluded.billing, shipping = excluded.shipping,
          customer_note = excluded.customer_note,
          placed_at = excluded.placed_at, item_count = excluded.item_count`);
      // replace items wholesale (snapshot data; safe + idempotent)
      await tx.execute(
        sql`delete from wp_migration.legacy_order_items where wp_order_id = ${p.wpId}`,
      );
      for (const it of p.items) {
        await tx.execute(sql`
          insert into wp_migration.legacy_order_items
            (wp_order_id, wp_order_item_id, product_name, wp_product_id,
             wp_variation_id, quantity, line_subtotal, line_total)
          values
            (${p.wpId}, ${it.wpItemId}, ${it.name}, ${it.wpProductId},
             ${it.wpVariationId}, ${it.qty}, ${it.subtotal}, ${it.total})`);
        bump(report, "order_items_staged");
      }
    });
    if (p.status === "delivered") bump(report, "orders_delivered", 1);
    if (p.customerWpId == null) bump(report, "orders_guest");
  }
  report.stats.orders_staged = plans.length;
  report.stats.delivered_revenue_paise = plans
    .filter((p) => p.status === "delivered")
    .reduce((s, p) => s + p.total, 0);
  report.notes.push(
    "Orders staged read-only in wp_migration.legacy_orders (owner decision #2); the app's orders table is untouched.",
    "Guest orders imported unlinked — wp_customer_id NULL (owner decision #3).",
    "Blanked DB rows patched from the Oct-22 export; DB line items preferred over CSV reconstruction where they survive.",
  );
}
