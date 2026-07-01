import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addToWishlist,
  isInWishlist,
  listWishlist,
  listWishlistedVariantIds,
  removeFromWishlist,
  wishlistCount,
} from "../src/dal/wishlist";
import {
  type TestDb,
  makeCategory,
  makeProduct,
  makeSupplier,
  makeTestDb,
  makeUser,
} from "./harness";

describe("wishlist DAL", () => {
  let t: TestDb;
  let A: string;
  let v1: string;
  let v2: string;

  beforeAll(async () => {
    t = await makeTestDb();
    const sup = await makeSupplier(t.db);
    const cat = await makeCategory(t.db, sup);
    v1 = (await makeProduct(t.db, { supplierId: sup, categoryId: cat, slug: "w1" })).variantId;
    v2 = (await makeProduct(t.db, { supplierId: sup, categoryId: cat, slug: "w2" })).variantId;
    A = await makeUser(t.db);
  });
  afterAll(() => t.close());

  it("adds (idempotent), checks, counts, lists ids", async () => {
    await addToWishlist(t.db, A, v1);
    await addToWishlist(t.db, A, v1); // dedupe
    await addToWishlist(t.db, A, v2);
    expect(await wishlistCount(t.db, A)).toBe(2);
    expect(await isInWishlist(t.db, A, v1)).toBe(true);
    expect(new Set(await listWishlistedVariantIds(t.db, A))).toEqual(
      new Set([v1, v2]),
    );
  });

  it("lists wishlist as product summaries", async () => {
    const items = await listWishlist(t.db, A);
    expect(items).toHaveLength(2);
    expect(items[0]!.variantId).toBeDefined();
    expect(items[0]!.price).toBeGreaterThan(0);
  });

  it("removes", async () => {
    await removeFromWishlist(t.db, A, v1);
    expect(await isInWishlist(t.db, A, v1)).toBe(false);
    expect(await wishlistCount(t.db, A)).toBe(1);
  });
});
