import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../src/schema";
import { getUserByClerkId, upsertUserFromClerk } from "../src/dal/users";
import { type TestDb, makeTestDb } from "./harness";

describe("user mirror (Clerk → local)", () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await makeTestDb();
  });
  afterAll(() => t.close());

  it("creates a customer row on first sync", async () => {
    const u = await upsertUserFromClerk(t.db, {
      clerkUserId: "user_a",
      phone: "clerk-user_a",
      name: null,
      email: null,
    });
    expect(u.role).toBe("customer");
    expect(u.phone).toBe("clerk-user_a");
  });

  it("PRESERVES an assigned role on re-sync (promotion survives webhook/login)", async () => {
    const u = await getUserByClerkId(t.db, "user_a");
    // admin promotes the account
    await t.db.update(users).set({ role: "owner" }).where(eq(users.id, u!.id));

    // a later webhook / login re-syncs from Clerk with the real phone
    const resynced = await upsertUserFromClerk(t.db, {
      clerkUserId: "user_a",
      phone: "+919812345678",
      name: "Owner",
      email: "owner@example.com",
    });

    expect(resynced.role).toBe("owner"); // role NOT reverted to customer
    expect(resynced.phone).toBe("+919812345678"); // placeholder phone healed
    expect(resynced.name).toBe("Owner");
    expect(resynced.id).toBe(u!.id); // same row (no duplicate)
  });

  it("preserves isBlocked across re-sync", async () => {
    const u = await getUserByClerkId(t.db, "user_a");
    await t.db
      .update(users)
      .set({ isBlocked: true })
      .where(eq(users.id, u!.id));
    const resynced = await upsertUserFromClerk(t.db, {
      clerkUserId: "user_a",
      phone: "+919812345678",
      name: "Owner",
      email: "owner@example.com",
    });
    expect(resynced.isBlocked).toBe(true);
    expect(resynced.role).toBe("owner");
  });
});
