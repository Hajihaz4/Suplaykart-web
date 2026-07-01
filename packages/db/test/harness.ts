import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/schema";
import {
  categories,
  inventory,
  productVariants,
  products,
  suppliers,
  users,
} from "../src/schema";
import type { DB } from "../src/client";

const dir = path.dirname(fileURLToPath(import.meta.url));

export interface TestDb {
  db: DB;
  close: () => Promise<void>;
}

/** A fresh migrated in-memory Postgres (PGlite) per test file. */
export async function makeTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  }) as unknown as DB;
  await migrate(db as never, {
    migrationsFolder: path.join(dir, "../drizzle"),
  });
  return { db, close: () => client.close() };
}

export async function makeSupplier(db: DB): Promise<string> {
  const [s] = await db
    .insert(suppliers)
    .values({ name: "Test Store", isDefault: true })
    .returning();
  return s!.id;
}

export async function makeCategory(
  db: DB,
  supplierId: string,
  slug = "snacks",
): Promise<string> {
  const [c] = await db
    .insert(categories)
    .values({ supplierId, name: "Snacks", slug })
    .returning();
  return c!.id;
}

export async function makeProduct(
  db: DB,
  opts: {
    supplierId: string;
    categoryId: string;
    slug?: string;
    price?: number;
    mrp?: number;
    stock?: number;
    isVeg?: boolean;
  },
): Promise<{ productId: string; variantId: string }> {
  const [p] = await db
    .insert(products)
    .values({
      supplierId: opts.supplierId,
      categoryId: opts.categoryId,
      name: "Test Product",
      slug: opts.slug ?? "test-product",
      isVeg: opts.isVeg ?? true,
    })
    .returning();
  const [v] = await db
    .insert(productVariants)
    .values({
      productId: p!.id,
      label: "1 unit",
      mrp: opts.mrp ?? 6000,
      price: opts.price ?? 5000,
      isDefault: true,
    })
    .returning();
  await db.insert(inventory).values({
    variantId: v!.id,
    supplierId: opts.supplierId,
    quantityOnHand: opts.stock ?? 50,
  });
  return { productId: p!.id, variantId: v!.id };
}

let userSeq = 0;
export async function makeUser(
  db: DB,
  opts: { role?: "customer" | "owner"; name?: string } = {},
): Promise<string> {
  userSeq += 1;
  const [u] = await db
    .insert(users)
    .values({
      clerkUserId: `clerk_${userSeq}`,
      phone: `+9190000000${String(userSeq).padStart(2, "0")}`,
      name: opts.name ?? `User ${userSeq}`,
      role: opts.role ?? "customer",
    })
    .returning();
  return u!.id;
}
