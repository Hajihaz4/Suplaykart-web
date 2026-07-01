import "dotenv/config";
import { db } from "./client";
import { seedBaseline } from "./seed-baseline";
import { seedCatalog } from "./seed-catalog";

/**
 * CLI wrapper:  pnpm --filter @suplaykart/db seed   (requires DATABASE_URL)
 * Seeds the baseline (supplier/store/areas/coupons) + the catalog.
 */
async function main() {
  const baseline = await seedBaseline(db);
  console.log(
    baseline.supplierCreated
      ? `✓ seeded default supplier ${baseline.supplierId}`
      : `• default supplier already existed ${baseline.supplierId}`,
  );

  const catalog = await seedCatalog(db, baseline.supplierId);
  console.log(
    `✓ catalog: ${catalog.categories} categories, ${catalog.productsCreated} new products`,
  );
  console.log("✓ seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
