import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../src/schema";
import {
  createAddress,
  deleteAddress,
  getAddressById,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "../src/dal/addresses";
import type { DB } from "../src/client";
import { type TestDb, makeTestDb, makeUser } from "./harness";

async function defaultAddr(db: DB, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u!.defaultAddressId;
}

const base = { house: "1", pincode: "611002", city: "Nagore", state: "TN" };

describe("address DAL", () => {
  let t: TestDb;
  let A: string;
  let B: string;

  beforeAll(async () => {
    t = await makeTestDb();
    A = await makeUser(t.db);
    B = await makeUser(t.db);
  });
  afterAll(() => t.close());

  it("makes the first address default and second not", async () => {
    const a1 = await createAddress(t.db, A, { label: "home", ...base });
    const a2 = await createAddress(t.db, A, { label: "work", ...base });
    expect(a1.isDefault).toBe(true);
    expect(a2.isDefault).toBe(false);
    const list = await listAddresses(t.db, A);
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(a1.id);
  });

  it("promotes a new default and syncs users.defaultAddressId", async () => {
    const list = await listAddresses(t.db, A);
    const work = list.find((x) => x.label === "work")!;
    await setDefaultAddress(t.db, A, work.id);
    expect(await defaultAddr(t.db, A)).toBe(work.id);
  });

  it("updates fields", async () => {
    const list = await listAddresses(t.db, A);
    const updated = await updateAddress(t.db, A, list[0]!.id, {
      label: "other",
      customLabel: "Mom",
      house: "99",
      pincode: "611002",
      city: "Nagore",
      state: "TN",
    });
    expect(updated?.customLabel).toBe("Mom");
    expect(updated?.house).toBe("99");
  });

  it("enforces ownership", async () => {
    const [a] = await listAddresses(t.db, A);
    expect(await getAddressById(t.db, B, a!.id)).toBeNull();
    expect(
      await updateAddress(t.db, B, a!.id, { label: "home", ...base }),
    ).toBeNull();
    expect(await deleteAddress(t.db, B, a!.id)).toBeNull();
  });

  it("stores and reads coordinates", async () => {
    const withGeo = await createAddress(t.db, B, {
      label: "home",
      ...base,
      lat: 10.822,
      lng: 79.842,
    });
    expect(Number(withGeo.lat)).toBeCloseTo(10.822, 3);
    expect(Number(withGeo.lng)).toBeCloseTo(79.842, 3);
    const noGeo = await createAddress(t.db, B, { label: "work", ...base });
    expect(noGeo.lat).toBeNull();
  });

  it("promotes another default when the default is deleted", async () => {
    const before = await listAddresses(t.db, A);
    const currentDefault = before.find((x) => x.isDefault)!;
    await deleteAddress(t.db, A, currentDefault.id);
    const after = await listAddresses(t.db, A);
    expect(after).toHaveLength(1);
    expect(after[0]!.isDefault).toBe(true);
    expect(await defaultAddr(t.db, A)).toBe(after[0]!.id);
  });
});
