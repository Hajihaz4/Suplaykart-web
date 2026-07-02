import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./tenancy";

/**
 * WP-migration — one row per user recording the single legacy-link attempt
 * (lazy phone-match on first OTP sign-in). The PK makes "run only once per
 * user" a database guarantee; only terminal outcomes are recorded here
 * (transient ones — no phone yet / staging schema absent — are not written,
 * so the link can still happen later).
 *
 * Outcomes: linked | ambiguous_linked_latest | no_match | already_claimed
 */
export const legacyCustomerLinks = pgTable("legacy_customer_links", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // matched wp user (null for no_match / already_claimed)
  wpUserId: bigint({ mode: "number" }),
  outcome: text().notNull(),
  // how many legacy customers shared the phone (ambiguity size)
  matchedCount: integer().notNull().default(0),
  // historical orders attributable through the matched legacy customer
  legacyOrders: integer().notNull().default(0),
  attemptedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
