/**
 * Target-database plumbing for the WP ETL.
 *
 * SAFETY MODEL
 *  - Live runs connect ONLY via WP_MIGRATION_DATABASE_URL (a fresh Neon
 *    branch). If that URL equals DATABASE_URL, we abort — the tool must never
 *    point at the app's configured database by accident.
 *  - `--dry-run` never opens a network connection: it rehearses the entire
 *    pipeline against an in-memory PGlite with the real migrations applied.
 *  - All legacy/staging data (customers, orders, bookkeeping) lives in a
 *    dedicated `wp_migration` Postgres schema — dropping that one schema
 *    reverts phases C/D entirely.
 *
 * IDEMPOTENCY / RESUME
 *  - Every created row is recorded in wp_migration.id_map (entity, legacy_id)
 *    → re-runs update-in-place instead of duplicating; a crash resumes by
 *    simply re-running the phase.
 */
import { sql } from "drizzle-orm";
import type { DB } from "../../client";

export interface Target {
  db: DB;
  dryRun: boolean;
  close(): Promise<void>;
}

/** Host + database identity of a Postgres URL, normalizing Neon's pooled
 *  (`-pooler`) hostname so pooled/direct aliases of one DB compare equal. */
function dbIdentity(raw: string): string {
  const u = new URL(raw);
  const host = u.hostname.replace(/-pooler(?=\.)/, "");
  return `${host}${u.pathname}`;
}

/**
 * Refuse to run against the production database. The comparison needs the
 * production DATABASE_URL to compare against; without it we cannot prove the
 * target is safe, so we fail closed (override: WP_MIGRATION_ALLOW_UNCHECKED=1
 * for environments that genuinely have no production URL to check).
 */
export function assertNotProduction(
  targetUrl: string,
  productionUrl: string | undefined,
): void {
  if (!productionUrl) {
    if (process.env.WP_MIGRATION_ALLOW_UNCHECKED === "1") return;
    throw new Error(
      "DATABASE_URL is not resolvable in this shell, so the target cannot be " +
        "cross-checked against production. Export DATABASE_URL (the app's " +
        "production URL) so the guard can verify the target differs, or set " +
        "WP_MIGRATION_ALLOW_UNCHECKED=1 if no production database exists yet.",
    );
  }
  let same: boolean;
  try {
    same = dbIdentity(targetUrl) === dbIdentity(productionUrl);
  } catch {
    same = targetUrl === productionUrl; // unparseable URL → strict compare
  }
  if (same) {
    throw new Error(
      "WP_MIGRATION_DATABASE_URL points at the same host+database as " +
        "DATABASE_URL (pooler aliases normalized) — refusing to run against " +
        "the app's configured database. Create a fresh Neon branch instead.",
    );
  }
}

export async function connectTarget(dryRun: boolean): Promise<Target> {
  if (dryRun) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = path.dirname(fileURLToPath(import.meta.url));
    const client = new PGlite();
    const pgdb = drizzle(client, { casing: "snake_case" }) as unknown as DB;
    await migrate(pgdb as never, {
      migrationsFolder: path.join(here, "../../../drizzle"),
    });
    // dry-run rehearsal seeds only the default supplier the app expects
    await pgdb.execute(
      sql`insert into suppliers (name, is_default) values ('Suplaykart', true)`,
    );
    return { db: pgdb, dryRun, close: () => client.close() };
  }

  const url = process.env.WP_MIGRATION_DATABASE_URL;
  if (!url) {
    throw new Error(
      "WP_MIGRATION_DATABASE_URL is not set. Point it at the FRESH Neon branch created for the import (never production). Or pass --dry-run.",
    );
  }
  assertNotProduction(url, process.env.DATABASE_URL);
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: url, max: 4 });
  const db = drizzle(pool, { casing: "snake_case" }) as unknown as DB;
  return { db, dryRun, close: () => pool.end() };
}

/** Create the wp_migration staging schema (idempotent). */
export async function bootstrapStaging(db: DB): Promise<void> {
  await db.execute(sql`create schema if not exists wp_migration`);
  await db.execute(sql`
    create table if not exists wp_migration.id_map (
      entity text not null,
      legacy_id text not null,
      new_id uuid,
      note text,
      created_at timestamptz not null default now(),
      primary key (entity, legacy_id)
    )`);
  await db.execute(sql`
    create table if not exists wp_migration.phase_state (
      phase text primary key,
      status text not null,
      stats jsonb,
      updated_at timestamptz not null default now()
    )`);
  await db.execute(sql`
    create table if not exists wp_migration.legacy_customers (
      wp_user_id bigint primary key,
      phone_raw text,
      phone text,
      name text,
      email text,
      role text,
      registered_at timestamptz,
      billing jsonb,
      shipping jsonb,
      linked_user_id uuid,
      linked_at timestamptz,
      created_at timestamptz not null default now()
    )`);
  await db.execute(
    sql`create index if not exists legacy_customers_phone_idx on wp_migration.legacy_customers (phone)`,
  );
  await db.execute(sql`
    create table if not exists wp_migration.legacy_orders (
      wp_order_id bigint primary key,
      order_number text not null,
      source text not null,          -- 'db' | 'csv-oct22-patch' | 'csv-only'
      status_raw text not null,
      status text not null,          -- delivered | cancelled
      currency text,
      subtotal integer,              -- paise
      delivery_fee integer,          -- paise
      total integer not null,        -- paise
      payment_method_raw text,
      payment_method text,           -- cod | upi_on_delivery
      wp_customer_id bigint,         -- null = guest (imported unlinked)
      billing jsonb,
      shipping jsonb,
      customer_note text,
      placed_at timestamptz,
      item_count integer not null default 0,
      created_at timestamptz not null default now()
    )`);
  await db.execute(
    sql`create index if not exists legacy_orders_customer_idx on wp_migration.legacy_orders (wp_customer_id)`,
  );
  await db.execute(sql`
    create table if not exists wp_migration.legacy_order_items (
      id uuid primary key default gen_random_uuid(),
      wp_order_id bigint not null references wp_migration.legacy_orders(wp_order_id) on delete cascade,
      wp_order_item_id bigint,
      product_name text not null,
      wp_product_id bigint,
      wp_variation_id bigint,
      quantity integer not null,
      line_subtotal integer,         -- paise
      line_total integer not null,   -- paise
      mapped_product_id uuid,
      mapped_variant_id uuid
    )`);
  await db.execute(
    sql`create index if not exists legacy_order_items_order_idx on wp_migration.legacy_order_items (wp_order_id)`,
  );
}

type Rows = { rows?: unknown[] } | unknown[];
const rowsOf = (r: Rows): Record<string, unknown>[] =>
  (Array.isArray(r) ? r : (r.rows ?? [])) as Record<string, unknown>[];

/** Look up an id_map entry. */
export async function mapGet(
  db: DB,
  entity: string,
  legacyId: string,
): Promise<string | null> {
  const r = await db.execute(
    sql`select new_id from wp_migration.id_map where entity = ${entity} and legacy_id = ${legacyId}`,
  );
  const row = rowsOf(r)[0];
  return row ? ((row.new_id as string | null) ?? null) : null;
}

/** Load the whole map for an entity (bulk, for hot loops). */
export async function mapAll(db: DB, entity: string): Promise<Map<string, string>> {
  const r = await db.execute(
    sql`select legacy_id, new_id from wp_migration.id_map where entity = ${entity} and new_id is not null`,
  );
  const m = new Map<string, string>();
  for (const row of rowsOf(r)) m.set(row.legacy_id as string, row.new_id as string);
  return m;
}

export async function mapPut(
  db: DB,
  entity: string,
  legacyId: string,
  newId: string | null,
  note?: string,
): Promise<void> {
  await db.execute(sql`
    insert into wp_migration.id_map (entity, legacy_id, new_id, note)
    values (${entity}, ${legacyId}, ${newId}, ${note ?? null})
    on conflict (entity, legacy_id) do update set new_id = excluded.new_id, note = excluded.note`);
}

export async function setPhaseState(
  db: DB,
  phase: string,
  status: "running" | "completed" | "failed",
  stats: unknown,
): Promise<void> {
  await db.execute(sql`
    insert into wp_migration.phase_state (phase, status, stats, updated_at)
    values (${phase}, ${status}, ${JSON.stringify(stats)}::jsonb, now())
    on conflict (phase) do update set status = excluded.status, stats = excluded.stats, updated_at = now()`);
}

export { rowsOf };
