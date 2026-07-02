import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  attemptLegacyLink,
  getLegacyLinkStatus,
  getLegacyMigrationStats,
  listLegacyOrdersForUser,
} from "../src/dal/legacy";
import { users } from "../src/schema";
import { bootstrapStaging, rowsOf } from "../src/etl/wp/target";
import { type TestDb, makeTestDb, makeUser } from "./harness";

async function linkedTo(t: TestDb, wpUserId: number): Promise<string | null> {
  const r = rowsOf(
    await t.db.execute(
      sql`select linked_user_id from wp_migration.legacy_customers where wp_user_id = ${wpUserId}`,
    ),
  );
  return (r[0]?.linked_user_id as string | null) ?? null;
}

describe("legacy-customer linking", () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await makeTestDb();
    await bootstrapStaging(t.db);
    // legacy customers: 101 unique phone; 201+202 share a phone (202 newer);
    // 301 will be pre-claimed; phones align with harness makeUser numbering
    await t.db.execute(sql`
      insert into wp_migration.legacy_customers (wp_user_id, phone, name, registered_at) values
        (101, '9000000001', 'Old One', '2025-01-10'),
        (201, '9000000002', 'Old Two A', '2025-01-01'),
        (202, '9000000002', 'Old Two B', '2025-06-01'),
        (301, '9000000004', 'Old Claimed', '2025-02-01')`);
    await t.db.execute(sql`
      insert into wp_migration.legacy_orders
        (wp_order_id, order_number, source, status_raw, status, total, item_count, placed_at, wp_customer_id) values
        (9001, 'WC-9001', 'db', 'wc-completed', 'delivered', 12300, 2, '2025-03-01', 101),
        (9002, 'WC-9002', 'db', 'wc-cancelled', 'cancelled',  5100, 1, '2025-04-01', 101),
        (9003, 'WC-9003', 'db', 'wc-completed', 'delivered',  8800, 1, '2025-05-01', 202),
        (9100, 'WC-9100', 'db', 'wc-completed', 'delivered',  4400, 1, '2025-05-02', null)`);
  });
  afterAll(() => t.close());

  it("links an exact phone match and surfaces historical orders", async () => {
    const u = await makeUser(t.db); // phone +919000000001
    const r = await attemptLegacyLink(t.db, { id: u, phone: "+919000000001" });
    expect(r.outcome).toBe("linked");
    expect(r.wpUserId).toBe(101);
    expect(r.matchedCount).toBe(1);
    expect(r.legacyOrders).toBe(2);
    expect(await linkedTo(t, 101)).toBe(u);

    const orders = await listLegacyOrdersForUser(t.db, u);
    expect(orders.map((o) => o.orderNumber)).toEqual(["WC-9002", "WC-9001"]);
    expect(orders[1]).toMatchObject({ total: 12300, itemCount: 2, status: "delivered" });
  });

  it("is idempotent and runs only once per user", async () => {
    const status = await getLegacyLinkStatus(
      t.db,
      (await t.db.select({ id: users.id }).from(users)).at(0)!.id,
    );
    expect(status?.outcome).toBe("linked");
    const again = await attemptLegacyLink(t.db, {
      id: (await t.db.select({ id: users.id }).from(users)).at(0)!.id,
      phone: "+919000000001",
    });
    expect(again.alreadyAttempted).toBe(true);
    expect(again.outcome).toBe("linked");
    const attempts = rowsOf(
      await t.db.execute(sql`select count(*)::int as n from legacy_customer_links`),
    );
    expect(attempts[0]!.n).toBe(1);
  });

  it("resolves duplicate phones to the most recent registration", async () => {
    const u = await makeUser(t.db); // phone +919000000002
    const r = await attemptLegacyLink(t.db, { id: u, phone: "+919000000002" });
    expect(r.outcome).toBe("ambiguous_linked_latest");
    expect(r.wpUserId).toBe(202); // newer registration wins
    expect(r.matchedCount).toBe(2);
    expect(r.legacyOrders).toBe(1);
    expect(await linkedTo(t, 202)).toBe(u);
    expect(await linkedTo(t, 201)).toBeNull(); // older duplicate stays unlinked
  });

  it("records no_match when no legacy customer shares the phone", async () => {
    const u = await makeUser(t.db); // phone +919000000003 — not seeded
    const r = await attemptLegacyLink(t.db, { id: u, phone: "+919000000003" });
    expect(r.outcome).toBe("no_match");
    expect(r.wpUserId).toBeNull();
    // recorded once; second call returns the record without re-searching
    const again = await attemptLegacyLink(t.db, { id: u, phone: "+919000000003" });
    expect(again).toMatchObject({ outcome: "no_match", alreadyAttempted: true });
  });

  it("never overwrites an existing link (already claimed)", async () => {
    const first = await makeUser(t.db); // +919000000004
    const r1 = await attemptLegacyLink(t.db, { id: first, phone: "+919000000004" });
    expect(r1.outcome).toBe("linked");
    expect(await linkedTo(t, 301)).toBe(first);

    // a second app user with the same normalized phone (different formatting)
    const [second] = await t.db
      .insert(users)
      .values({ clerkUserId: "clerk_dup", phone: "919000000004", name: "Dup" })
      .returning({ id: users.id });
    const r2 = await attemptLegacyLink(t.db, {
      id: second!.id,
      phone: "919000000004",
    });
    expect(r2.outcome).toBe("already_claimed");
    expect(r2.wpUserId).toBeNull();
    expect(await linkedTo(t, 301)).toBe(first); // original link intact
  });

  it("leaves older duplicates for manual review when the newest is claimed", async () => {
    await t.db.execute(sql`
      insert into wp_migration.legacy_customers (wp_user_id, phone, name, registered_at) values
        (401, '9000000005', 'Old Five A', '2025-01-01'),
        (402, '9000000005', 'Old Five B', '2025-07-01')`);
    const first = await makeUser(t.db); // +919000000005
    const r1 = await attemptLegacyLink(t.db, { id: first, phone: "+919000000005" });
    expect(r1).toMatchObject({ outcome: "ambiguous_linked_latest", wpUserId: 402 });

    // second app user with the same normalized phone: the newest match is
    // claimed → newest-or-nothing policy records already_claimed and the
    // older duplicate stays unlinked for manual review (never auto-claimed)
    const [second] = await t.db
      .insert(users)
      .values({ clerkUserId: "clerk_dup5", phone: "919000000005", name: null })
      .returning({ id: users.id });
    const r2 = await attemptLegacyLink(t.db, {
      id: second!.id,
      phone: "919000000005",
    });
    expect(r2.outcome).toBe("already_claimed");
    expect(await linkedTo(t, 402)).toBe(first); // intact
    expect(await linkedTo(t, 401)).toBeNull(); // for manual review
  });

  it("never links or lists guest orders", async () => {
    // 9100 is a guest order (wp_customer_id null) — invisible to everyone
    for (const row of await t.db.select({ id: users.id }).from(users)) {
      const orders = await listLegacyOrdersForUser(t.db, row.id);
      expect(orders.map((o) => o.orderNumber)).not.toContain("WC-9100");
    }
    const guest = rowsOf(
      await t.db.execute(
        sql`select wp_customer_id from wp_migration.legacy_orders where wp_order_id = 9100`,
      ),
    );
    expect(guest[0]!.wp_customer_id).toBeNull();
  });

  it("does not record transient outcomes (placeholder phone)", async () => {
    const [u] = await t.db
      .insert(users)
      .values({ clerkUserId: "clerk_ph", phone: "clerk-abc123", name: null })
      .returning({ id: users.id });
    const r = await attemptLegacyLink(t.db, { id: u!.id, phone: "clerk-abc123" });
    expect(r.outcome).toBe("no_phone");
    expect(await getLegacyLinkStatus(t.db, u!.id)).toBeNull(); // can retry later
  });

  it("reports admin migration statistics", async () => {
    const s = await getLegacyMigrationStats(t.db);
    expect(s.staging).not.toBeNull();
    expect(s.staging!.customersTotal).toBe(6);
    expect(s.staging!.customersLinked).toBe(4); // 101, 202, 301, 402
    expect(s.staging!.ordersTotal).toBe(4);
    expect(s.staging!.ordersAttributable).toBe(3); // guest order excluded
    expect(s.staging!.deliveredRevenue).toBe(12300 + 8800 + 4400);
    expect(s.attempts).toMatchObject({
      linked: 2,
      ambiguous_linked_latest: 2,
      no_match: 1,
      already_claimed: 2,
    });
  });
});

describe("legacy linking without the staging schema", () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await makeTestDb(); // no bootstrapStaging — wp_migration absent
  });
  afterAll(() => t.close());

  it("degrades gracefully and records nothing", async () => {
    const u = await makeUser(t.db);
    const r = await attemptLegacyLink(t.db, { id: u, phone: "+919000000001" });
    expect(r.outcome).toBe("no_legacy_data");
    expect(await getLegacyLinkStatus(t.db, u)).toBeNull(); // retryable later
    expect(await listLegacyOrdersForUser(t.db, u)).toEqual([]);
    const s = await getLegacyMigrationStats(t.db);
    expect(s.staging).toBeNull();
  });
});
