/**
 * End-to-end DB connectivity verification against a REAL Postgres (PGlite — a
 * WASM build of Postgres, no Docker/Neon/native binaries needed): runs the
 * committed Drizzle migration, seeds, and exercises the DAL.
 *
 *   pnpm --filter @suplaykart/db verify:db
 *
 * Note: production uses node-postgres against Neon; PGlite is used here only to
 * prove the migration + seed + DAL execute correctly against a genuine Postgres
 * engine in this Docker-less environment.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "../src/schema";
import { seedBaseline } from "../src/seed-baseline";
import type { DB } from "../src/client";
import {
  pingDatabase,
  getDefaultSupplier,
  isServiceable,
  upsertUserFromClerk,
  getUserByClerkId,
} from "../src/dal";

const dir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const client = new PGlite(); // ephemeral in-memory Postgres
  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  }) as unknown as DB;

  console.log("→ running migrations…");
  await migrate(db as never, {
    migrationsFolder: path.join(dir, "../drizzle"),
  });

  const tableCount = await db.execute(
    sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
  );
  const enumCount = await db.execute(
    sql`select count(distinct t.typname)::int as n from pg_type t join pg_enum e on t.oid = e.enumtypid`,
  );

  console.log("→ seeding baseline…");
  const seeded = await seedBaseline(db);
  const seededAgain = await seedBaseline(db); // prove idempotency

  console.log("→ exercising DAL…");
  const health = await pingDatabase(db);
  const supplier = await getDefaultSupplier(db);
  const serviceable611002 = await isServiceable(db, "611002");
  const serviceable999999 = await isServiceable(db, "999999");
  const upserted = await upsertUserFromClerk(db, {
    clerkUserId: "user_verify_1",
    phone: "+919487867816",
    name: "Verify User",
  });
  const fetched = await getUserByClerkId(db, "user_verify_1");
  const coupons = await db.execute(sql`select code from coupons order by code`);

  console.log("\n════════ VERIFICATION RESULT ════════");
  console.log(
    JSON.stringify(
      {
        migrations: "applied",
        publicTables: (tableCount.rows[0] as { n: number }).n,
        enums: (enumCount.rows[0] as { n: number }).n,
        health,
        defaultSupplier: supplier?.name ?? null,
        seedCreatedSupplier: seeded.supplierCreated,
        secondSeedCreatedSupplier: seededAgain.supplierCreated,
        isServiceable_611002: serviceable611002,
        isServiceable_999999: serviceable999999,
        upsertedUserId: upserted.id,
        fetchedUserPhone: fetched?.phone ?? null,
        coupons: (coupons.rows as { code: string }[]).map((r) => r.code),
      },
      null,
      2,
    ),
  );
  console.log("✓ DB connectivity verified end-to-end");

  await client.close();
}

main().catch((err) => {
  console.error("✗ verification failed:", err);
  process.exit(1);
});
