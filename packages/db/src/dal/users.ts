import { eq } from "drizzle-orm";
import type { DB } from "../client";
import { users } from "../schema";

export type User = typeof users.$inferSelect;

export type UpsertUserInput = {
  clerkUserId: string;
  phone: string;
  name?: string | null;
  email?: string | null;
};

/** Look up the local profile mirror by Clerk user id. */
export async function getUserByClerkId(
  db: DB,
  clerkUserId: string,
): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(db: DB, id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Mirror a Clerk identity into the local `users` table (idempotent on
 * `clerk_user_id`). Called from the Clerk webhook and from getCurrentUser().
 */
export async function upsertUserFromClerk(
  db: DB,
  input: UpsertUserInput,
): Promise<User> {
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

/** Update the editable profile fields (name, email). Ownership by id. */
export async function updateProfile(
  db: DB,
  userId: string,
  input: { name?: string | null; email?: string | null },
): Promise<User | null> {
  const rows = await db
    .update(users)
    .set({
      name: input.name ?? null,
      email: input.email ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return rows[0] ?? null;
}
