import { eq } from "drizzle-orm";
import type { DB } from "../client";
import { suppliers } from "../schema";

/** The single-tenant default supplier (the multi-supplier seam). */
export async function getDefaultSupplier(db: DB) {
  const rows = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isDefault, true))
    .limit(1);
  return rows[0] ?? null;
}

/** Like getDefaultSupplier, but throws if the store has not been seeded. */
export async function requireDefaultSupplier(db: DB) {
  const supplier = await getDefaultSupplier(db);
  if (!supplier) {
    throw new Error("No default supplier configured — run the database seed.");
  }
  return supplier;
}
