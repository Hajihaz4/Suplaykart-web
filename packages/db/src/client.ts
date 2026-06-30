import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Drizzle client backed by Neon's serverless HTTP driver.
 *
 * `DATABASE_URL` must be the POOLED Neon connection string. The client is
 * constructed lazily-safe: `neon("")` does not throw at import time, only on
 * the first query — so importing the schema never requires the env var.
 */
const connectionString = process.env.DATABASE_URL;

const sql = neon(connectionString ?? "");

export const db = drizzle(sql, { schema, casing: "snake_case" });

export type DB = typeof db;
