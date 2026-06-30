import { timestamp } from "drizzle-orm/pg-core";

/** `created_at` + `updated_at` (timestamptz, auto-managed). */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

/** `created_at` only (for append-only / immutable rows). */
export const createdAt = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
};
