/**
 * Legacy-customer linking — connects Clerk users to their migrated WordPress
 * history (wp_migration staging schema) by normalized phone.
 *
 * Guarantees:
 *  - once per user: `legacy_customer_links.userId` is the PK; terminal
 *    outcomes are recorded exactly once and returned on every later call
 *  - never overwrites: `legacy_customers.linked_user_id` is only set while
 *    NULL; a claimed customer can never be re-linked
 *  - transient states (no phone yet, staging schema absent) are NOT recorded,
 *    so linking still happens when the data/phone arrives
 *  - safe without the wp_migration schema: every staging query degrades to
 *    "no data" instead of throwing
 */
import { eq, sql } from "drizzle-orm";
import type { DB } from "../client";
import { legacyCustomerLinks } from "../schema";
import { writeAudit } from "./admin-ops";
import { normalizePhone } from "../etl/wp/util";

export type LegacyLinkOutcome =
  | "linked"
  | "ambiguous_linked_latest"
  | "no_match"
  | "already_claimed"
  | "no_phone" // transient — not recorded
  | "no_legacy_data"; // transient — not recorded

export interface LegacyLinkResult {
  outcome: LegacyLinkOutcome;
  wpUserId: number | null;
  matchedCount: number;
  legacyOrders: number;
  alreadyAttempted: boolean;
}

export interface LegacyOrderSummary {
  wpOrderId: number;
  orderNumber: string;
  status: string; // delivered | cancelled
  total: number; // paise
  itemCount: number;
  placedAt: Date | null;
}

type Rows = { rows?: unknown[] } | unknown[];
const rowsOf = (r: Rows): Record<string, unknown>[] =>
  (Array.isArray(r) ? r : (r.rows ?? [])) as Record<string, unknown>[];

/**
 * True only for "wp_migration relation/schema does not exist" (staging not set
 * up). Deliberately narrow: permission errors, timeouts, or column drift must
 * surface, not be masked as "no data".
 */
function isMissingStaging(err: unknown): boolean {
  // prefer Postgres codes: 42P01 undefined_table, 3F000 invalid_schema_name
  for (let e: unknown = err; e instanceof Error; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (code === "42P01" || code === "3F000") return /wp_migration/i.test(e.message);
    if (typeof code === "string") return false; // a different, real PG error
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /(relation|schema|table)\s+"?wp_migration/i.test(msg) &&
    /does not exist/i.test(msg)
  );
}

async function recordAttempt(
  db: DB,
  userId: string,
  result: Omit<LegacyLinkResult, "alreadyAttempted">,
): Promise<LegacyLinkResult> {
  const inserted = await db
    .insert(legacyCustomerLinks)
    .values({
      userId,
      wpUserId: result.wpUserId,
      outcome: result.outcome,
      matchedCount: result.matchedCount,
      legacyOrders: result.legacyOrders,
    })
    .onConflictDoNothing()
    .returning({ userId: legacyCustomerLinks.userId });
  if (inserted.length > 0) return { ...result, alreadyAttempted: false };
  // lost a concurrent race — the first attempt's record wins
  const prior = await getLegacyLinkStatus(db, userId);
  return prior
    ? { ...prior, alreadyAttempted: true }
    : { ...result, alreadyAttempted: true };
}

/**
 * Attempt (or return the recorded result of) the one-time legacy link for a
 * user. Idempotent — safe to call from sign-in and page renders alike.
 */
export async function attemptLegacyLink(
  db: DB,
  user: { id: string; phone: string },
): Promise<LegacyLinkResult> {
  // 1) already attempted → return the recorded terminal result
  const prior = await getLegacyLinkStatus(db, user.id);
  if (prior) return { ...prior, alreadyAttempted: true };

  // 2) transient: phone not yet known (Clerk placeholder) — try again later
  const phone = normalizePhone(user.phone);
  if (!phone) {
    return { outcome: "no_phone", wpUserId: null, matchedCount: 0, legacyOrders: 0, alreadyAttempted: false };
  }

  // 3) find phone matches in staging (newest registration first)
  let matches: { wpUserId: number; linkedUserId: string | null }[];
  try {
    const r = await db.execute(sql`
      select wp_user_id, linked_user_id from wp_migration.legacy_customers
      where phone = ${phone}
      order by registered_at desc nulls last, wp_user_id desc`);
    matches = rowsOf(r).map((row) => ({
      wpUserId: Number(row.wp_user_id),
      linkedUserId: (row.linked_user_id as string | null) ?? null,
    }));
  } catch (err) {
    if (isMissingStaging(err)) {
      // transient: ETL hasn't run against this database — try again later
      return { outcome: "no_legacy_data", wpUserId: null, matchedCount: 0, legacyOrders: 0, alreadyAttempted: false };
    }
    throw err;
  }

  if (matches.length === 0) {
    return recordAttempt(db, user.id, {
      outcome: "no_match",
      wpUserId: null,
      matchedCount: 0,
      legacyOrders: 0,
    });
  }

  // 4) never overwrite + newest-or-nothing (documented ambiguity policy):
  //    only the MOST RECENTLY registered match may be claimed; if that row is
  //    already claimed by someone else, the rest stay unlinked for manual
  //    review — regardless of arrival order or races. This keeps the terminal
  //    outcome deterministic for identical inputs.
  const mine = matches.find((m) => m.linkedUserId === user.id);
  const newest = matches[0]!;
  const candidate = mine ?? (newest.linkedUserId === null ? newest : undefined);
  if (!candidate) {
    return recordAttempt(db, user.id, {
      outcome: "already_claimed",
      wpUserId: null,
      matchedCount: matches.length,
      legacyOrders: 0,
    });
  }

  // 5) claim + verify + ledger atomically: a crash can't leave a claimed
  //    customer without its ledger row, and a lost race records
  //    already_claimed — the same outcome a later sequential arrival gets.
  return db.transaction(async (rawTx) => {
    const tx = rawTx as unknown as DB;
    await tx.execute(sql`
      update wp_migration.legacy_customers
      set linked_user_id = ${user.id}, linked_at = now()
      where wp_user_id = ${candidate.wpUserId} and linked_user_id is null`);
    const check = rowsOf(
      await tx.execute(sql`
        select linked_user_id from wp_migration.legacy_customers
        where wp_user_id = ${candidate.wpUserId}`),
    )[0];
    if ((check?.linked_user_id as string | null) !== user.id) {
      // raced by another session and lost — that claim stands
      return recordAttempt(tx, user.id, {
        outcome: "already_claimed",
        wpUserId: null,
        matchedCount: matches.length,
        legacyOrders: 0,
      });
    }

    const orderCount = Number(
      (rowsOf(
        await tx.execute(sql`
          select count(*)::int as n from wp_migration.legacy_orders
          where wp_customer_id = ${candidate.wpUserId}`),
      )[0]?.n as number | undefined) ?? 0,
    );

    const result = await recordAttempt(tx, user.id, {
      outcome: matches.length > 1 ? "ambiguous_linked_latest" : "linked",
      wpUserId: candidate.wpUserId,
      matchedCount: matches.length,
      legacyOrders: orderCount,
    });
    if (!result.alreadyAttempted) {
      await writeAudit(tx, {
        actorUserId: user.id,
        action: "legacy.link",
        entity: "user",
        entityId: user.id,
        summary: `Linked legacy customer #${candidate.wpUserId} (${orderCount} historical order(s)${matches.length > 1 ? `, ${matches.length} phone matches` : ""})`,
      });
    }
    return result;
  });
}

/** The recorded attempt for a user, or null if none yet. */
export async function getLegacyLinkStatus(
  db: DB,
  userId: string,
): Promise<Omit<LegacyLinkResult, "alreadyAttempted"> | null> {
  const [row] = await db
    .select()
    .from(legacyCustomerLinks)
    .where(eq(legacyCustomerLinks.userId, userId));
  if (!row) return null;
  return {
    outcome: row.outcome as LegacyLinkOutcome,
    wpUserId: row.wpUserId,
    matchedCount: row.matchedCount,
    legacyOrders: row.legacyOrders,
  };
}

/** Read-only historical orders for a linked user (guest orders excluded). */
export async function listLegacyOrdersForUser(
  db: DB,
  userId: string,
  limit = 50,
): Promise<LegacyOrderSummary[]> {
  try {
    const r = await db.execute(sql`
      select o.wp_order_id, o.order_number, o.status, o.total, o.item_count, o.placed_at
      from wp_migration.legacy_orders o
      join wp_migration.legacy_customers c on c.wp_user_id = o.wp_customer_id
      where c.linked_user_id = ${userId}
      order by o.placed_at desc nulls last
      limit ${limit}`);
    return rowsOf(r).map((row) => ({
      wpOrderId: Number(row.wp_order_id),
      orderNumber: String(row.order_number),
      status: String(row.status),
      total: Number(row.total),
      itemCount: Number(row.item_count),
      placedAt: row.placed_at ? new Date(row.placed_at as string) : null,
    }));
  } catch (err) {
    if (isMissingStaging(err)) return [];
    throw err;
  }
}

export interface LegacyMigrationStats {
  attempts: Record<string, number>;
  staging: {
    customersTotal: number;
    customersLinked: number;
    ordersTotal: number;
    ordersAttributable: number; // orders whose legacy customer is linked
    deliveredRevenue: number; // paise
  } | null;
}

/** Admin: linking progress + staging totals (staging null until ETL runs). */
export async function getLegacyMigrationStats(
  db: DB,
): Promise<LegacyMigrationStats> {
  const attemptRows = await db
    .select({
      outcome: legacyCustomerLinks.outcome,
      n: sql<number>`count(*)::int`,
    })
    .from(legacyCustomerLinks)
    .groupBy(legacyCustomerLinks.outcome);
  const attempts = Object.fromEntries(attemptRows.map((r) => [r.outcome, r.n]));

  try {
    const c = rowsOf(
      await db.execute(sql`
        select count(*)::int as total,
               count(linked_user_id)::int as linked
        from wp_migration.legacy_customers`),
    )[0];
    const o = rowsOf(
      await db.execute(sql`
        select count(*)::int as total,
               count(*) filter (where wp_customer_id in
                 (select wp_user_id from wp_migration.legacy_customers where linked_user_id is not null))::int as attributable,
               coalesce(sum(total) filter (where status = 'delivered'), 0)::bigint as revenue
        from wp_migration.legacy_orders`),
    )[0];
    return {
      attempts,
      staging: {
        customersTotal: Number(c?.total ?? 0),
        customersLinked: Number(c?.linked ?? 0),
        ordersTotal: Number(o?.total ?? 0),
        ordersAttributable: Number(o?.attributable ?? 0),
        deliveredRevenue: Number(o?.revenue ?? 0),
      },
    };
  } catch (err) {
    if (isMissingStaging(err)) return { attempts, staging: null };
    throw err;
  }
}
