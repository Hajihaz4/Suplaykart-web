import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { users } from "./tenancy";
import { addressLabel } from "./enums";

/** §1.4 — customer delivery addresses. */
export const addresses = pgTable(
  "addresses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: addressLabel().notNull().default("home"),
    customLabel: text(),
    recipientName: text(),
    recipientPhone: text(),
    house: text().notNull(),
    floor: text(),
    area: text(),
    landmark: text(),
    pincode: text().notNull(),
    city: text().notNull(),
    state: text().notNull(),
    lat: numeric(),
    lng: numeric(),
    isDefault: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("addresses_user_idx").on(t.userId, t.isActive)],
);
