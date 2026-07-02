import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  attemptLegacyLink,
  db,
  getUserByClerkId,
  upsertUserFromClerk,
  type User,
} from "@suplaykart/db";

/**
 * Sync the Clerk user into `users`, then attempt the one-time legacy-customer
 * link (WP migration) by phone. The attempt is idempotent, records terminal
 * outcomes once, and must never block sign-in — failures are swallowed.
 */
async function syncAndLink(input: {
  clerkUserId: string;
  phone: string;
  name: string | null;
  email: string | null;
}): Promise<User> {
  const user = await upsertUserFromClerk(db, input);
  if (user.role === "customer" && !user.phone.startsWith("clerk-")) {
    try {
      await attemptLegacyLink(db, { id: user.id, phone: user.phone });
    } catch {
      // linking is best-effort; the account page retries lazily
    }
  }
  return user;
}

/**
 * The signed-in local user (Clerk session → local DB row). Lazily syncs the
 * `users` row if the webhook hasn't created it yet (e.g. localhost dev).
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await getUserByClerkId(db, userId);
  if (existing) {
    // Self-heal a placeholder phone written by an earlier lazy sync (when
    // Clerk hadn't surfaced the number yet). Only runs while the placeholder
    // is present; the upsert preserves role/isBlocked (never overwritten).
    if (existing.phone.startsWith("clerk-")) {
      const cu = await currentUser();
      const realPhone =
        cu?.primaryPhoneNumber?.phoneNumber ??
        cu?.phoneNumbers[0]?.phoneNumber ??
        null;
      if (realPhone) {
        const name =
          [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") ||
          existing.name;
        const email =
          cu?.primaryEmailAddress?.emailAddress ??
          cu?.emailAddresses[0]?.emailAddress ??
          existing.email;
        // the real phone just became known — this is the first moment the
        // legacy link can actually match, so route through syncAndLink
        return syncAndLink({
          clerkUserId: userId,
          phone: realPhone,
          name,
          email,
        });
      }
    }
    return existing;
  }

  const cu = await currentUser();
  const phone =
    cu?.primaryPhoneNumber?.phoneNumber ??
    cu?.phoneNumbers[0]?.phoneNumber ??
    `clerk-${userId}`;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || null;
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses[0]?.emailAddress ??
    null;

  return syncAndLink({ clerkUserId: userId, phone, name, email });
}

/** Like getCurrentUser but never null — redirects home if unauthenticated. */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/** True for any staff tier (support/ops/admin/owner) — not a customer. */
export function isStaff(user: User): boolean {
  return user.role !== "customer";
}

/**
 * Gate for the admin area. Requires a signed-in staff user; customers are
 * redirected home. Defense-in-depth on top of the middleware auth check.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireCurrentUser();
  if (!isStaff(user)) redirect("/");
  return user;
}
