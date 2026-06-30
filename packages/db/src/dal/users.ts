import { eq } from "drizzle-orm";
import type { DB } from "../client";
import { users } from "../schema";

export type UpsertUserInput = {
  clerkUserId: string;
  phone: string;
  name?: string | null;
  email?: string | null;
};

/** Look up the local profile mirror by Clerk user id. */
export async function getUserByClerkId(db: DB, clerkUserId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Mirror a Clerk identity into the local `users` table (idempotent on
 * `clerk_user_id`). Called from the Clerk webhook on user.created/updated.
 */
export async function upsertUserFromClerk(db: DB, input: UpsertUserInput) {
  const rows = await db
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      phone: input.phone,
      name: input.name ?? null,
      email: input.email ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        phone: input.phone,
        name: input.name ?? null,
        email: input.email ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0]!;
}
