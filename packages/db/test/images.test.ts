import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addProductImage,
  deleteProductImage,
  getPrimaryImageUrl,
  listProductImages,
  reorderProductImages,
} from "../src/dal/images";
import {
  type TestDb,
  makeCategory,
  makeProduct,
  makeSupplier,
  makeTestDb,
} from "./harness";

describe("product image DAL", () => {
  let t: TestDb;
  let S: string;
  let other: string;
  let productId: string;

  beforeAll(async () => {
    t = await makeTestDb();
    S = await makeSupplier(t.db);
    other = await makeSupplier(t.db);
    const cat = await makeCategory(t.db, S);
    productId = (await makeProduct(t.db, { supplierId: S, categoryId: cat })).productId;
  });
  afterAll(() => t.close());

  it("appends images with increasing sortOrder", async () => {
    const a = await addProductImage(t.db, S, { productId, url: "https://cdn/a.jpg" });
    const b = await addProductImage(t.db, S, { productId, url: "https://cdn/b.jpg" });
    expect(a?.sortOrder).toBe(0);
    expect(b?.sortOrder).toBe(1);
    const list = await listProductImages(t.db, productId);
    expect(list.map((i) => i.url)).toEqual(["https://cdn/a.jpg", "https://cdn/b.jpg"]);
  });

  it("returns the primary (lowest sortOrder) image url", async () => {
    expect(await getPrimaryImageUrl(t.db, productId)).toBe("https://cdn/a.jpg");
  });

  it("enforces supplier ownership on add", async () => {
    const denied = await addProductImage(t.db, other, {
      productId,
      url: "https://cdn/hack.jpg",
    });
    expect(denied).toBeNull();
    expect(await listProductImages(t.db, productId)).toHaveLength(2);
  });

  it("reorders and re-selects the primary", async () => {
    const list = await listProductImages(t.db, productId);
    const reversed = [list[1]!.id, list[0]!.id];
    expect(await reorderProductImages(t.db, S, productId, reversed)).toBe(true);
    expect(await getPrimaryImageUrl(t.db, productId)).toBe("https://cdn/b.jpg");
  });

  it("deletes (ownership-checked) and returns the row for storage cleanup", async () => {
    const list = await listProductImages(t.db, productId);
    const target = list[0]!;
    expect(await deleteProductImage(t.db, other, target.id)).toBeNull(); // wrong supplier
    const removed = await deleteProductImage(t.db, S, target.id);
    expect(removed?.url).toBe(target.url);
    expect(await listProductImages(t.db, productId)).toHaveLength(1);
  });
});
