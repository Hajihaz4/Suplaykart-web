// Public entrypoint for @suplaykart/db.
// - schema (tables + enums) is safe to import anywhere
// - `db` client requires DATABASE_URL at query time
// - dal/* are typed data-access helpers (each takes a DB instance)
export * from "./schema";
export { db, pool, type DB } from "./client";
export * from "./dal";
export { seedBaseline } from "./seed-baseline";
