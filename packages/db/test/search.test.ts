import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { categories, productVariants, products, suppliers } from "../src/schema";
import {
  searchFacets,
  searchProducts,
  searchSuggestions,
} from "../src/dal/catalog";
import type { DB } from "../src/client";
import { type TestDb, makeTestDb } from "./harness";

async function seedProduct(
  db: DB,
  supplierId: string,
  categoryId: string,
  name: string,
  brand: string,
  slug: string,
  price: number,
) {
  const [p] = await db
    .insert(products)
    .values({
      supplierId,
      categoryId,
      name,
      brand,
      slug,
      description: "daily essential grocery",
    })
    .returning();
  await db.insert(productVariants).values({
    productId: p!.id,
    label: "1 unit",
    mrp: price,
    price,
    isDefault: true,
  });
}

describe("full-text search", () => {
  let t: TestDb;
  let S: string;

  beforeAll(async () => {
    t = await makeTestDb();
    const [sup] = await t.db
      .insert(suppliers)
      .values({ name: "Store", isDefault: true })
      .returning();
    S = sup!.id;
    const [dairy] = await t.db
      .insert(categories)
      .values({ supplierId: S, name: "Dairy", slug: "dairy" })
      .returning();
    const [grains] = await t.db
      .insert(categories)
      .values({ supplierId: S, name: "Grains", slug: "grains" })
      .returning();
    await seedProduct(t.db, S, dairy!.id, "Aavin Full Cream Milk", "Aavin", "milk", 6200);
    await seedProduct(t.db, S, dairy!.id, "Amul Butter", "Amul", "butter", 5000);
    await seedProduct(t.db, S, grains!.id, "Coca-Cola Drink", "Coca-Cola", "coke-drink", 4000);
    await seedProduct(t.db, S, grains!.id, "Aashirvaad Atta", "Aashirvaad", "atta", 30000);
  });
  afterAll(() => t.close());

  it("matches full words", async () => {
    const r = await searchProducts(t.db, S, "milk");
    expect(r.map((p) => p.slug)).toContain("milk");
  });

  it("matches by prefix (as-you-type)", async () => {
    const r = await searchProducts(t.db, S, "mil");
    expect(r.map((p) => p.slug)).toContain("milk");
  });

  it("expands synonyms (coke → cola/coca, flour → atta)", async () => {
    const coke = await searchProducts(t.db, S, "coke");
    expect(coke.map((p) => p.slug)).toContain("coke-drink");
    const flour = await searchProducts(t.db, S, "flour");
    expect(flour.map((p) => p.slug)).toContain("atta");
  });

  it("filters by category and sorts", async () => {
    const inDairy = await searchProducts(t.db, S, "essential", {
      categorySlug: "dairy",
    });
    expect(inDairy.length).toBeGreaterThan(0);
    expect(inDairy.every((p) => ["milk", "butter"].includes(p.slug))).toBe(true);
    const byPrice = await searchProducts(t.db, S, "essential", {
      sort: "price_asc",
    });
    expect(byPrice.length).toBe(4);
    for (let i = 1; i < byPrice.length; i++) {
      expect(byPrice[i]!.price).toBeGreaterThanOrEqual(byPrice[i - 1]!.price);
    }
  });

  it("returns facets and suggestions", async () => {
    const facets = await searchFacets(t.db, S, "essential");
    expect(facets.reduce((n, f) => n + f.count, 0)).toBe(4);
    expect(facets.length).toBe(2);
    const sugg = await searchSuggestions(t.db, S, "mil");
    expect(sugg.some((s) => s.slug === "milk")).toBe(true);
  });

  it("returns nothing for an empty query", async () => {
    expect(await searchProducts(t.db, S, "   ")).toHaveLength(0);
  });
});
