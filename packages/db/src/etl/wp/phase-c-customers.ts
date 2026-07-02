/**
 * Phase C — customers: WP users → wp_migration.legacy_customers staging.
 *
 * Owner decision #4: lazy phone-match — customers are NOT inserted into the
 * app `users` table (clerkUserId is NOT NULL). Instead they are staged with a
 * normalized phone; when a customer first signs in via OTP, the app can match
 * `legacy_customers.phone` and link (`linked_user_id`) to surface history.
 *
 * Duplicate phones (113 groups in the dump) are staged as-is — linking picks
 * the row with the most recent registration; the rest stay unlinked.
 */
import { sql } from "drizzle-orm";
import type { DB } from "../../client";
import type { WpData } from "./wp-load";
import { bump, warn, type PhaseReport } from "./report";
import { normalizePhone, toUtcDate } from "./util";

function role(capabilities: string | undefined): string {
  const m = /"([a-z_ ]+)";b:1/.exec(capabilities ?? "");
  return m?.[1] ?? "customer";
}

export async function runPhaseC(
  db: DB,
  data: WpData,
  report: PhaseReport,
): Promise<void> {
  const phoneSeen = new Map<string, number>();
  for (const [wpId, u] of data.users) {
    const meta = data.usermeta.get(wpId) ?? new Map<string, string>();
    const r = role(meta.get("wp_capabilities"));
    if (r !== "customer") {
      bump(report, "skipped_non_customer");
      continue; // staff/admin accounts are not migrated (Clerk handles staff)
    }
    const phoneRaw = meta.get("billing_phone") ?? null;
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      warn(report, `wp user ${wpId}: no normalizable phone — staged unlinked-only`);
      bump(report, "customers_without_phone");
    } else {
      phoneSeen.set(phone, (phoneSeen.get(phone) ?? 0) + 1);
    }
    const name =
      [meta.get("first_name"), meta.get("last_name")].filter(Boolean).join(" ").trim() ||
      u.displayName ||
      null;
    const billing = {
      firstName: meta.get("billing_first_name") ?? null,
      lastName: meta.get("billing_last_name") ?? null,
      address1: meta.get("billing_address_1") ?? null,
      address2: meta.get("billing_address_2") ?? null,
      city: meta.get("billing_city") ?? null,
      state: meta.get("billing_state") ?? null,
      pincode: meta.get("billing_postcode") ?? null,
    };
    const hasAddress = Boolean(billing.address1);
    await db.execute(sql`
      insert into wp_migration.legacy_customers
        (wp_user_id, phone_raw, phone, name, email, role, registered_at, billing)
      values
        (${Number(wpId)}, ${phoneRaw}, ${phone}, ${name}, ${u.email || null},
         ${r}, ${toUtcDate(u.registered)}, ${JSON.stringify(billing)}::jsonb)
      on conflict (wp_user_id) do update set
        phone_raw = excluded.phone_raw, phone = excluded.phone,
        name = excluded.name, email = excluded.email,
        registered_at = excluded.registered_at, billing = excluded.billing`);
    bump(report, "customers_staged");
    if (hasAddress) bump(report, "customers_with_address");
  }
  const dupGroups = [...phoneSeen.values()].filter((n) => n > 1).length;
  report.stats.duplicate_phone_groups = dupGroups;
  report.notes.push(
    "Customers staged in wp_migration.legacy_customers — NOT in users (lazy Clerk phone-match at first OTP login, owner decision #4).",
    "Duplicate-phone groups link to the most recently registered account at match time; others remain unlinked for manual review.",
  );
}
