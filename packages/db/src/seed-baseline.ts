import { eq } from "drizzle-orm";
import type { DB } from "./client";
import {
  suppliers,
  storeSettings,
  serviceableAreas,
  coupons,
} from "./schema";

/**
 * Phase-1 baseline seed (idempotent) — pure function, no side effects on
 * import. Seeds the single-tenant default supplier, its store settings, the
 * Nagore serviceable areas, and the two legacy coupons. Money is in paise.
 */
export async function seedBaseline(db: DB) {
  // 1) Default supplier — the single-tenant seam.
  const existing = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.isDefault, true))
    .limit(1);

  let supplierId = existing[0]?.id;
  let supplierCreated = false;
  if (!supplierId) {
    const inserted = await db
      .insert(suppliers)
      .values({ name: "Suplaykart Store", isDefault: true })
      .returning({ id: suppliers.id });
    supplierId = inserted[0]!.id;
    supplierCreated = true;
  }

  // 2) Store settings (₹15 delivery, ₹3 handling, free ≥ ₹49).
  await db
    .insert(storeSettings)
    .values({
      supplierId,
      isOpen: true,
      deliveryFee: 1500,
      handlingFee: 300,
      freeDeliveryThreshold: 4900,
      taxInclusive: true,
    })
    .onConflictDoNothing();

  // 3) Serviceable areas — Nagore live, Nagapattinam coming soon.
  await db
    .insert(serviceableAreas)
    .values([
      {
        supplierId,
        pincode: "611002",
        city: "Nagore",
        areaName: "Nagore",
        status: "live",
      },
      {
        supplierId,
        pincode: "611001",
        city: "Nagapattinam",
        areaName: "Nagapattinam Town",
        status: "coming_soon",
        expectedLaunch: "2026",
      },
    ])
    .onConflictDoNothing();

  // 4) Legacy coupons.
  await db
    .insert(coupons)
    .values([
      {
        code: "WELCOME10",
        type: "percent",
        value: 10,
        minOrderAmount: 10000,
        maxDiscountAmount: 5000,
      },
      {
        code: "NAGORE40",
        type: "flat",
        value: 4000,
        minOrderAmount: 29900,
        perUserLimit: 1,
      },
    ])
    .onConflictDoNothing();

  return { supplierId, supplierCreated };
}
