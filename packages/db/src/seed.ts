import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import {
  suppliers,
  storeSettings,
  serviceableAreas,
  coupons,
} from "./schema";

/**
 * Phase-1 baseline seed (idempotent). Requires DATABASE_URL.
 *   pnpm --filter @suplaykart/db seed
 *
 * Seeds the single-tenant default supplier (the multi-supplier seam), its store
 * settings, the live + coming-soon serviceable areas for Nagore, and the two
 * legacy coupons. Money is in paise. No catalog/products are seeded here.
 */
async function main() {
  // 1) Default supplier — the single-tenant seam.
  const existing = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.isDefault, true))
    .limit(1);

  let supplierId = existing[0]?.id;
  if (!supplierId) {
    const inserted = await db
      .insert(suppliers)
      .values({ name: "Suplaykart Store", isDefault: true })
      .returning({ id: suppliers.id });
    supplierId = inserted[0]!.id;
    console.log("✓ seeded default supplier", supplierId);
  } else {
    console.log("• default supplier already exists", supplierId);
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

  // 4) Legacy coupons (WELCOME10 = 10% / min ₹100 / max ₹50; NAGORE40 = flat ₹40 / min ₹299).
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

  console.log("✓ seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
