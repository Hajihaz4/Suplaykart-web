// Public entrypoint for @suplaykart/db.
// Schema (tables + enums) is safe to import anywhere; the db client requires
// DATABASE_URL at query time.
export * from "./schema";
export { db, type DB } from "./client";
