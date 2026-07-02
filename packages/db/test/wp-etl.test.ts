import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { parseTuples, iterInserts } from "../src/etl/wp/dump-parser";
import { normalizePhone, toPaise, toSlug, stripHtml } from "../src/etl/wp/util";
import { parseCsv } from "../src/etl/wp/csv";
import type { WpData } from "../src/etl/wp/wp-load";
import { assertNotProduction, bootstrapStaging, rowsOf } from "../src/etl/wp/target";
import { newReport } from "../src/etl/wp/report";
import { runPhaseA } from "../src/etl/wp/phase-a-catalog";
import { runPhaseC } from "../src/etl/wp/phase-c-customers";
import { runPhaseD } from "../src/etl/wp/phase-d-orders";
import { runPhaseE } from "../src/etl/wp/phase-e-validate";
import { type TestDb, makeSupplier, makeTestDb } from "./harness";

// ── unit: parsers & helpers ─────────────────────────────────────────────────

describe("wp-etl parsers", () => {
  it("parses MySQL tuples with escapes, NULLs, and nested parens", () => {
    const rows = parseTuples(
      String.raw`(1,'it''s \'ok\'','a,b(c)',NULL,3.5),(2,'line\nbreak','',0,NULL)`,
    );
    expect(rows).toEqual([
      ["1", "it's 'ok'", "a,b(c)", null, "3.5"],
      ["2", "line\nbreak", "", "0", null],
    ]);
  });

  it("streams INSERTs for target tables from a gzip dump", async () => {
    const dump = [
      "-- comment",
      "INSERT INTO `wp_other` VALUES (9,'skip');",
      "INSERT INTO `wp_terms` VALUES (1,'Snacks','snacks',0),(2,'Milk & \\'Dairy\\'','milk-dairy',0);",
    ].join("\n");
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), "wpetl-")), "d.sql.gz");
    writeFileSync(file, gzipSync(dump));
    const got: string[][] = [];
    for await (const { table, rows } of iterInserts(file, new Set(["wp_terms"]))) {
      expect(table).toBe("wp_terms");
      for (const r of rows) got.push(r.map(String));
    }
    expect(got).toHaveLength(2);
    expect(got[1]![1]).toBe("Milk & 'Dairy'");
  });

  it("normalizes money, phones, slugs, html", () => {
    expect(toPaise("38.00")).toBe(3800);
    expect(toPaise("'-1")).toBe(-100); // WebToffee guard prefix
    expect(toPaise("")).toBeNull();
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
    expect(normalizePhone("12345")).toBeNull();
    expect(toSlug("Aavin%20Milk", "x")).toBe("aavin-milk"); // decodes %20
    expect(toSlug("", "fallback-9")).toBe("fallback-9");
    expect(stripHtml("<p>Fresh &amp; tasty</p><br>")).toBe("Fresh & tasty");
  });

  it("production guard fails closed and normalizes Neon pooler aliases", () => {
    const prod = "postgresql://u:p@ep-red-1-pooler.ap-southeast-1.aws.neon.tech/neondb";
    const direct = "postgresql://u:p@ep-red-1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    const branch = "postgresql://u:p@ep-blue-2-pooler.ap-southeast-1.aws.neon.tech/neondb";
    // same DB via direct (non-pooler) host + different creds/params → refused
    expect(() => assertNotProduction(direct, prod)).toThrow(/same host\+database/);
    expect(() => assertNotProduction(prod, prod)).toThrow(/same host\+database/);
    // genuinely different branch host → allowed
    expect(() => assertNotProduction(branch, prod)).not.toThrow();
    // production URL unresolvable → fail closed (no silent pass)
    delete process.env.WP_MIGRATION_ALLOW_UNCHECKED;
    expect(() => assertNotProduction(branch, undefined)).toThrow(/cannot be cross-checked/);
    process.env.WP_MIGRATION_ALLOW_UNCHECKED = "1";
    expect(() => assertNotProduction(branch, undefined)).not.toThrow();
    delete process.env.WP_MIGRATION_ALLOW_UNCHECKED;
  });

  it("parses quoted CSV with embedded commas and newlines", () => {
    const f = path.join(mkdtempSync(path.join(os.tmpdir(), "wpcsv-")), "t.csv");
    writeFileSync(f, '﻿a,b\n"1,5","x\ny"\n2,z\n');
    const rows = parseCsv(f);
    expect(rows).toEqual([
      { a: "1,5", b: "x\ny" },
      { a: "2", b: "z" },
    ]);
  });
});

// ── integration: phases on PGlite ───────────────────────────────────────────

/** Minimal synthetic WpData: 1 category tree, 1 simple + 1 variable product,
 *  2 customers, 2 DB orders + 1 blanked order patched from a fixture CSV. */
function makeWpData(): WpData {
  const posts = new Map();
  posts.set("100", { id: "100", type: "product", status: "publish", title: "Aavin Milk",
    name: "aavin-milk", content: "<p>Fresh</p>", excerpt: "", parent: "0", guid: "", menuOrder: 0, date: "2025-01-01 00:00:00" });
  posts.set("200", { id: "200", type: "product", status: "private", title: "Hidden Combo",
    name: "hidden-combo", content: "", excerpt: "", parent: "0", guid: "", menuOrder: 0, date: "2025-01-02 00:00:00" });
  posts.set("300", { id: "300", type: "product", status: "publish", title: "Basmati Rice",
    name: "basmati-rice", content: "", excerpt: "", parent: "0", guid: "", menuOrder: 0, date: "2025-01-03 00:00:00" });
  posts.set("301", { id: "301", type: "product_variation", status: "publish", title: "1kg",
    name: "basmati-1kg", content: "", excerpt: "", parent: "300", guid: "", menuOrder: 1, date: "2025-01-03 00:00:00" });
  posts.set("302", { id: "302", type: "product_variation", status: "publish", title: "5kg",
    name: "basmati-5kg", content: "", excerpt: "", parent: "300", guid: "", menuOrder: 2, date: "2025-01-03 00:00:00" });

  const postmeta = new Map<string, Map<string, string>>();
  postmeta.set("100", new Map([
    ["_price", "35"], ["_regular_price", "50"], ["_manage_stock", "yes"], ["_stock", "'-3"],
  ]));
  postmeta.set("200", new Map([["_price", "99"], ["_regular_price", "99"], ["_stock_status", "instock"]]));
  postmeta.set("301", new Map([
    ["_price", "80"], ["_regular_price", "90"], ["attribute_pa_weight", "1-kg"], ["_stock_status", "instock"],
  ]));
  postmeta.set("302", new Map([
    ["_price", "380"], ["_regular_price", "400"], ["attribute_pa_weight", "5-kg"], ["_stock_status", "outofstock"],
  ]));

  return {
    posts: posts as WpData["posts"],
    postmeta,
    terms: new Map([
      ["1", { name: "All products", slug: "all-products" }],
      ["2", { name: "Dairy", slug: "dairy" }],
      ["3", { name: "Milk", slug: "milk" }],
    ]),
    productCats: new Map([
      ["11", { termId: "1", parent: "0" }],
      ["12", { termId: "2", parent: "0" }],
      ["13", { termId: "3", parent: "2" }],
    ]),
    termParents: new Map([["1", "0"], ["2", "0"], ["3", "2"]]),
    termThumbs: new Map(),
    productTerms: new Map([
      ["100", new Set(["1", "2", "3"])],
      ["300", new Set(["2"])],
    ]),
    primaryTerm: new Map(),
    users: new Map([
      ["7", { login: "c1", email: "c1@example.com", registered: "2025-02-01 10:00:00", displayName: "Customer One" }],
      ["8", { login: "staff", email: "s@example.com", registered: "2025-02-01 10:00:00", displayName: "Staff" }],
    ]),
    usermeta: new Map([
      ["7", new Map([["wp_capabilities", 'a:1:{s:8:"customer";b:1;}'], ["billing_phone", "+919812345678"], ["billing_address_1", "12 Beach Rd"], ["billing_city", "Nagore"], ["billing_postcode", "611002"]])],
      ["8", new Map([["wp_capabilities", 'a:1:{s:13:"administrator";b:1;}']])],
    ]),
    orders: new Map([
      ["9001", { id: "9001", status: "wc-completed", currency: "INR", total: "123.00", customerId: "7",
        billingEmail: "c1@example.com", dateCreated: "2025-03-01 09:00:00",
        paymentMethod: "cod", paymentMethodTitle: "Cash & UPI on delivery", customerNote: null }],
      ["9002", { id: "9002", status: "pending", currency: null, total: "0", customerId: "0",
        billingEmail: null, dateCreated: "2025-03-02 09:00:00", paymentMethod: null,
        paymentMethodTitle: null, customerNote: null }],
      ["9003", { id: "9003", status: "pending", currency: null, total: "0", customerId: "0",
        billingEmail: null, dateCreated: "2025-03-03 09:00:00", paymentMethod: null,
        paymentMethodTitle: null, customerNote: null }],
    ]),
    orderAddresses: new Map([
      ["9001", { billing: { first_name: "C", city: "Nagore", postcode: "611002", phone: "9812345678" } }],
    ]),
    orderItems: [
      { itemId: "1", orderId: "9001", name: "Aavin Milk", type: "line_item" },
    ],
    orderItemMeta: new Map([
      ["1", new Map([["_qty", "2"], ["_line_total", "70.00"], ["_line_subtotal", "100.00"], ["_product_id", "100"], ["_variation_id", "0"]])],
    ]),
  };
}

/** Fixture CSVs: order 9002 was blanked but completed in the Oct-22 export;
 *  order 9500 exists only in the CSV (purged from the DB). 9003 stays abandoned. */
function writeFixtureCsvs(dir: string): void {
  mkdirSync(path.join(dir, "raw-csv"), { recursive: true });
  const hdr =
    "order_id,order_number,order_date,status,order_total,order_subtotal,shipping_total,order_currency," +
    "payment_method,payment_method_title,customer_id,customer_note," +
    "billing_first_name,billing_last_name,billing_phone,billing_address_1,billing_address_2,billing_city,billing_state,billing_postcode," +
    '"Product Item 1 Name","Product Item 1 id","Product Item 1 SKU","Product Item 1 Quantity","Product Item 1 Total","Product Item 1 Subtotal"';
  const oct = [
    hdr,
    '9002,9002,2025-03-02 09:00:00,completed,55.00,50.00,5.00,INR,cod,"Cash & UPI on delivery",0,,G,Uest,9899999999,1 Rd,,Nagore,TN,611002,eggs,10645,,5,32.50,32.50',
    '9003,9003,2025-03-03 09:00:00,pending,,,,,,,0,,,,,,,,,,,,,,,',
    '9500,9500,2025-04-01 10:00:00,completed,88.00,88.00,0.00,INR,cod,"Pay on delivery",0,,P,Urged,9877777777,2 Rd,,Nagore,TN,611002,"Rice, Basmati",300,,1,88.00,88.00',
  ].join("\n");
  writeFileSync(
    path.join(dir, "raw-csv", "local_file_1761106625_order_export_2025-10-22-04-08-14.csv"),
    oct,
  );
  writeFileSync(
    path.join(dir, "raw-csv", "order_export_2025-12-15-11-42-48.csv"),
    hdr + "\n",
  );
}

describe("wp-etl phases (PGlite)", () => {
  let t: TestDb;
  const data = makeWpData();
  let ws: string;

  beforeAll(async () => {
    t = await makeTestDb();
    await makeSupplier(t.db);
    await bootstrapStaging(t.db);
    ws = mkdtempSync(path.join(os.tmpdir(), "wp-ws-"));
    writeFixtureCsvs(ws);
    process.env.WP_WORKSPACE = ws;
  });
  afterAll(() => {
    delete process.env.WP_WORKSPACE;
    return t.close();
  });

  it("phase A imports catalog with variants, clamped stock, inactive private", async () => {
    const r = newReport("phase-a-catalog", true);
    await runPhaseA(t.db, data, r);
    expect(r.stats.categories_inserted).toBe(2); // dairy + milk (all-products skipped)
    expect(r.stats.products_inserted).toBe(3);
    expect(r.stats.variants_inserted).toBe(4); // 2 simple + 2 variations
    expect(r.stats.stock_clamped_negative).toBe(1);

    const prods = rowsOf(await t.db.execute(sql`select slug, is_active from products order by slug`));
    expect(prods.map((p) => [p.slug, p.is_active])).toEqual([
      ["aavin-milk", true],
      ["basmati-rice", true],
      ["hidden-combo", false], // private → inactive (decision #5)
    ]);
    const milkChild = rowsOf(await t.db.execute(
      sql`select c.slug as child, p.slug as parent from categories c join categories p on p.id = c.parent_id`,
    ));
    expect(milkChild).toEqual([{ child: "milk", parent: "dairy" }]);
    const variants = rowsOf(await t.db.execute(
      sql`select v.label, v.price, v.mrp, i.quantity_on_hand as qty
          from product_variants v join inventory i on i.variant_id = v.id
          join products p on p.id = v.product_id where p.slug = 'basmati-rice' order by v.sort_order`,
    ));
    expect(variants).toEqual([
      { label: "1 Kg", price: 8000, mrp: 9000, qty: 100 },
      { label: "5 Kg", price: 38000, mrp: 40000, qty: 0 },
    ]);
    const clamped = rowsOf(await t.db.execute(
      sql`select i.quantity_on_hand as qty from inventory i
          join product_variants v on v.id = i.variant_id
          join products p on p.id = v.product_id where p.slug = 'aavin-milk'`,
    ));
    expect(clamped).toEqual([{ qty: 0 }]); // '-3 clamped
  });

  it("phase A re-run is idempotent (updates, no duplicates)", async () => {
    const r = newReport("phase-a-catalog", true);
    await runPhaseA(t.db, data, r);
    expect(r.stats.products_inserted ?? 0).toBe(0);
    expect(r.stats.products_updated).toBe(3);
    const n = rowsOf(await t.db.execute(sql`select count(*)::int as n from products`));
    expect(n[0]!.n).toBe(3);
    const v = rowsOf(await t.db.execute(sql`select count(*)::int as n from product_variants`));
    expect(v[0]!.n).toBe(4);
  });

  it("phase C stages customers only (staff skipped), never touches users", async () => {
    const r = newReport("phase-c-customers", true);
    await runPhaseC(t.db, data, r);
    expect(r.stats.customers_staged).toBe(1);
    expect(r.stats.skipped_non_customer).toBe(1);
    const rows = rowsOf(await t.db.execute(
      sql`select phone, name from wp_migration.legacy_customers`,
    ));
    expect(rows).toEqual([{ phone: "9812345678", name: "Customer One" }]);
    const users = rowsOf(await t.db.execute(sql`select count(*)::int as n from users`));
    expect(users[0]!.n).toBe(0);
  });

  it("phase D merges db + oct22 patch + csv-only, skips abandoned", async () => {
    const r = newReport("phase-d-orders", true);
    await runPhaseD(t.db, data, r);
    expect(r.stats.orders_from_db).toBe(1);
    expect(r.stats.orders_patched_from_oct22).toBe(1);
    expect(r.stats.orders_csv_only).toBe(1);
    expect(r.stats.orders_abandoned_skipped).toBe(1);
    const rows = rowsOf(await t.db.execute(
      sql`select wp_order_id::int as id, source, status, total, item_count
          from wp_migration.legacy_orders order by wp_order_id`,
    ));
    expect(rows).toEqual([
      { id: 9001, source: "db", status: "delivered", total: 12300, item_count: 1 },
      { id: 9002, source: "csv-oct22-patch", status: "delivered", total: 5500, item_count: 1 },
      { id: 9500, source: "csv-only", status: "delivered", total: 8800, item_count: 1 },
    ]);
    // idempotent re-run
    await runPhaseD(t.db, data, newReport("phase-d-orders", true));
    const n = rowsOf(await t.db.execute(sql`select count(*)::int as n from wp_migration.legacy_orders`));
    expect(n[0]!.n).toBe(3);
    const items = rowsOf(await t.db.execute(sql`select count(*)::int as n from wp_migration.legacy_order_items`));
    expect(items[0]!.n).toBe(3);
  });

  it("phase E validates the synthetic import end-to-end", async () => {
    const r = newReport("phase-e-validate", true);
    const { passed, failures } = await runPhaseE(t.db, data, r);
    expect(failures).toEqual([]);
    expect(passed).toBe(true);
    expect(r.stats.delivered_revenue_paise).toBe(12300 + 5500 + 8800);
  });
});
