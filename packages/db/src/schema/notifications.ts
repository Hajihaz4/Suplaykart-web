import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { timestamps, createdAt } from "./_helpers";
import { users } from "./tenancy";
import { notificationType } from "./enums";

/** §1.8 — notification feed. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    data: jsonb(), // order_id / coupon code etc.
    isRead: boolean().notNull().default(false),
    isPinned: boolean().notNull().default(false),
    ...createdAt,
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/** §1.8 — per-user notification toggles. */
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  whatsapp: boolean().notNull().default(true),
  push: boolean().notNull().default(true),
  promotional: boolean().notNull().default(true),
  storeStatus: boolean().notNull().default(true),
  ...timestamps,
});
