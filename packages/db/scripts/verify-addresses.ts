/**
 * Address DAL lifecycle verification (create → list → set-default → update →
 * ownership → delete+promote) against a real Postgres engine (PGlite).
 *
 *   pnpm --filter @suplaykart/db verify:addresses
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/schema";
import { users } from "../src/schema";
import type { DB } from "../src/client";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "../src/dal/addresses";

const dir = path.dirname(fileURLToPath(import.meta.url));

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓", msg);
}

async function userDefault(db: DB, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id));
  return rows[0]!.defaultAddressId;
}

async function main() {
  const client = new PGlite();
  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  }) as unknown as DB;
  await migrate(db as never, {
    migrationsFolder: path.join(dir, "../drizzle"),
  });

  const [ua] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_A", phone: "+919000000001", name: "User A" })
    .returning();
  const [ub] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_B", phone: "+919000000002", name: "User B" })
    .returning();
  const A = ua!.id;
  const B = ub!.id;

  console.log("→ create");
  const addr1 = await createAddress(db, A, {
    label: "home",
    house: "12 Main St",
    pincode: "611002",
    city: "Nagore",
    state: "Tamil Nadu",
  });
  assert(addr1.isDefault === true, "first address becomes default");
  const addr2 = await createAddress(db, A, {
    label: "work",
    house: "Tech Park",
    pincode: "611001",
    city: "Nagapattinam",
    state: "Tamil Nadu",
    isDefault: false,
  });
  assert(addr2.isDefault === false, "second address is not default");

  console.log("→ list");
  let list = await listAddresses(db, A);
  assert(list.length === 2, "user A has 2 addresses");
  assert(list[0]!.id === addr1.id, "default is listed first");

  console.log("→ setDefault");
  await setDefaultAddress(db, A, addr2.id);
  list = await listAddresses(db, A);
  assert(
    list.find((x) => x.id === addr2.id)!.isDefault === true,
    "addr2 is now default",
  );
  assert(
    list.find((x) => x.id === addr1.id)!.isDefault === false,
    "addr1 is no longer default",
  );
  assert((await userDefault(db, A)) === addr2.id, "users.defaultAddressId = addr2");

  console.log("→ update");
  const updated = await updateAddress(db, A, addr1.id, {
    label: "other",
    customLabel: "Mom's place",
    house: "New House 99",
    pincode: "611002",
    city: "Nagore",
    state: "Tamil Nadu",
  });
  assert(
    updated?.customLabel === "Mom's place" && updated.house === "New House 99",
    "addr1 fields updated",
  );

  console.log("→ ownership enforcement");
  assert((await getAddressById(db, B, addr1.id)) === null, "B cannot read A's address");
  assert(
    (await updateAddress(db, B, addr1.id, {
      label: "home",
      house: "hack",
      pincode: "000000",
      city: "X",
      state: "Y",
    })) === null,
    "B cannot update A's address",
  );
  assert((await deleteAddress(db, B, addr1.id)) === null, "B cannot delete A's address");

  console.log("→ delete default + promotion");
  await deleteAddress(db, A, addr2.id);
  list = await listAddresses(db, A);
  assert(list.length === 1, "user A has 1 active address after delete");
  assert(
    list[0]!.id === addr1.id && list[0]!.isDefault === true,
    "addr1 promoted to default",
  );
  assert((await userDefault(db, A)) === addr1.id, "users.defaultAddressId promoted to addr1");

  console.log("\n✓ address lifecycle + ownership verified end-to-end");
  await client.close();
}

main().catch((e) => {
  console.error("✗ verification failed:", e);
  process.exit(1);
});
