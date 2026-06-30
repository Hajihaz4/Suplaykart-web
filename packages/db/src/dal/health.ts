import { sql } from "drizzle-orm";
import type { DB } from "../client";

/** Liveness/readiness check — round-trips a trivial query. */
export async function pingDatabase(
  db: DB,
): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  await db.execute(sql`select 1`);
  return { ok: true, latencyMs: Math.round(performance.now() - start) };
}
