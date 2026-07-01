import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { products } from "../src/schema";
import {
  getProductDetailBySlug,
  listProductsBySlugs,
  listRelatedProducts,
} from "../src/dal/catalog";
import {
  type TestDb,
  makeCategory,
  makeProduct,
  makeSupplier,
  makeTestDb,
} from "./harness";

// Covers the helpers behind recently-viewed and related-products, which the
// FTS-focused search.test.ts does not exercise.
describe("catalog helpers — recently-viewed & related", () => {
  let t: TestDb;
  let sup: string;
  let cat: string;
  let other: string;
  let pA: string;
  let pB: string;

  beforeAll(async () => {
    t = await makeTestDb();
    sup = await makeSupplier(t.db);
    cat = await makeCategory(t.db, sup, "snacks");
    other = await makeCategory(t.db, sup, "beverages");
    pA = (
      await makeProduct(t.db, {
        supplierId: sup,
        categoryId: cat,
        slug: "prod-a",
      })
    ).productId;
    pB = (
      await makeProduct(t.db, {
        supplierId: sup,
        categoryId: cat,
        slug: "prod-b",
      })
    ).productId;
    await makeProduct(t.db, {
      supplierId: sup,
      categoryId: other,
      slug: "prod-c",
    });
  });
  afterAll(() => t.close());

  it("lists related products from the same category, excluding self", async () => {
    const related = await listRelatedProducts(t.db, sup, cat, pA);
    const slugs = related.map((r) => r.slug);
    expect(slugs).toContain("prod-b");
    expect(slugs).not.toContain("prod-a"); // excludes the product itself
    expect(slugs).not.toContain("prod-c"); // different category
  });

  it("preserves requested slug order and drops missing/inactive", async () => {
    const ordered = await listProductsBySlugs(t.db, sup, [
      "prod-b",
      "prod-a",
      "ghost",
    ]);
    expect(ordered.map((p) => p.slug)).toEqual(["prod-b", "prod-a"]);

    await t.db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, pB));
    const afterDeactivate = await listProductsBySlugs(t.db, sup, [
      "prod-b",
      "prod-a",
    ]);
    expect(afterDeactivate.map((p) => p.slug)).toEqual(["prod-a"]);
  });

  it("returns full product detail by slug", async () => {
    const detail = await getProductDetailBySlug(t.db, sup, "prod-a");
    expect(detail).not.toBeNull();
    expect(detail!.slug).toBe("prod-a");
    expect(detail!.id).toBe(pA);
  });
});
