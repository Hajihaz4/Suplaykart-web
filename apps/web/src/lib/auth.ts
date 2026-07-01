import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, getUserByClerkId, upsertUserFromClerk, type User } from "@suplaykart/db";

/**
 * The signed-in local user (Clerk session → local DB row). Lazily syncs the
 * `users` row if the webhook hasn't created it yet (e.g. localhost dev).
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await getUserByClerkId(db, userId);
  if (existing) return existing;

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

  return upsertUserFromClerk(db, { clerkUserId: userId, phone, name, email });
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
