import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Drizzle client backed by node-postgres (pg).
 *
 * Chosen over the neon-http driver because the Phase-1 order/inventory
 * lifecycles need **interactive transactions** (reserve-all-or-fail), which
 * neon-http does not support. `pg` works against Neon's POOLED endpoint
 * (TCP+TLS) on a Node.js runtime (Vercel Fluid Compute) and against any
 * standard Postgres locally.
 *
 * `DATABASE_URL` must be the pooled connection string in production. The Pool
 * connects lazily (first query), so importing this module never requires the
 * env var to be set. A dev-only global singleton avoids pool leaks under HMR.
 */
const globalForDb = globalThis as unknown as { __suplaykartPool?: Pool };

const pool =
  globalForDb.__suplaykartPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__suplaykartPool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type DB = typeof db;
export { pool };
