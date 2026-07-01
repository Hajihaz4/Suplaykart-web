import { eq } from "drizzle-orm";
import type { DB } from "../client";
import { serviceableAreas } from "../schema";

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
