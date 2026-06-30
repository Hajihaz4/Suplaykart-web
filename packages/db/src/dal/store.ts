import { eq } from "drizzle-orm";
import type { DB } from "../client";
import { suppliers, serviceableAreas } from "../schema";

/** The single-tenant default supplier (the multi-supplier seam). */
export async function getDefaultSupplier(db: DB) {
  const rows = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isDefault, true))
    .limit(1);
  return rows[0] ?? null;
}

export async function getServiceableArea(db: DB, pincode: string) {
  const rows = await db
    .select()
    .from(serviceableAreas)
    .where(eq(serviceableAreas.pincode, pincode))
    .limit(1);
  return rows[0] ?? null;
}

/** True only when the pincode is a `live` serviceable area. */
export async function isServiceable(db: DB, pincode: string): Promise<boolean> {
  const area = await getServiceableArea(db, pincode);
  return area?.status === "live";
}
