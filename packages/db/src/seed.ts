import "dotenv/config";
import { db } from "./client";
import { seedBaseline } from "./seed-baseline";

/**
 * CLI wrapper:  pnpm --filter @suplaykart/db seed   (requires DATABASE_URL)
 */
async function main() {
  const result = await seedBaseline(db);
  console.log(
    result.supplierCreated
      ? `✓ seeded default supplier ${result.supplierId}`
      : `• default supplier already existed ${result.supplierId}`,
  );
  console.log("✓ seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
