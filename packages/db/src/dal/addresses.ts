import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../client";
import { addresses, users } from "../schema";

export type Address = typeof addresses.$inferSelect;

export type AddressInput = {
  label: "home" | "work" | "other";
  customLabel?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  house: string;
  floor?: string | null;
  area?: string | null;
  landmark?: string | null;
  pincode: string;
  city: string;
  state: string;
  isDefault?: boolean;
};

/** Active addresses for a user, default first, newest next. */
export async function listAddresses(
  db: DB,
  userId: string,
): Promise<Address[]> {
  return db
    .select()
    .from(addresses)
    .where(and(eq(addresses.userId, userId), eq(addresses.isActive, true)))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

/** A single address, scoped to its owner (ownership enforced). */
export async function getAddressById(
  db: DB,
  userId: string,
  id: string,
): Promise<Address | null> {
  const rows = await db
    .select()
    .from(addresses)
    .where(
      and(
        eq(addresses.id, id),
        eq(addresses.userId, userId),
        eq(addresses.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function editableFields(input: AddressInput) {
  return {
    label: input.label,
    customLabel: input.customLabel ?? null,
    recipientName: input.recipientName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    house: input.house,
    floor: input.floor ?? null,
    area: input.area ?? null,
    landmark: input.landmark ?? null,
    pincode: input.pincode,
    city: input.city,
    state: input.state,
  };
}

export async function createAddress(
  db: DB,
  userId: string,
  input: AddressInput,
): Promise<Address> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.isActive, true)));

    // first address is always default
    const makeDefault = Boolean(input.isDefault) || existing.length === 0;

    if (makeDefault) {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, userId), eq(addresses.isActive, true)));
    }

    const rows = await tx
      .insert(addresses)
      .values({
        userId,
        ...editableFields(input),
        isDefault: makeDefault,
        isActive: true,
      })
      .returning();
    const created = rows[0]!;

    if (makeDefault) {
      await tx
        .update(users)
        .set({ defaultAddressId: created.id, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    return created;
  });
}

export async function updateAddress(
  db: DB,
  userId: string,
  id: string,
  input: AddressInput,
): Promise<Address | null> {
  return db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.userId, userId),
          eq(addresses.isActive, true),
        ),
      )
      .limit(1);
    if (!owned[0]) return null;

    const promote = Boolean(input.isDefault);
    if (promote) {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, userId), eq(addresses.isActive, true)));
    }

    const rows = await tx
      .update(addresses)
      .set({
        ...editableFields(input),
        ...(promote ? { isDefault: true } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    const updated = rows[0] ?? null;

    if (updated && promote) {
      await tx
        .update(users)
        .set({ defaultAddressId: updated.id, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    return updated;
  });
}

/** Soft-delete (isActive=false), promoting another address to default if needed. */
export async function deleteAddress(
  db: DB,
  userId: string,
  id: string,
): Promise<Address | null> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(addresses)
      .set({ isActive: false, isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.userId, userId),
          eq(addresses.isActive, true),
        ),
      )
      .returning();
    const deleted = rows[0] ?? null;
    if (!deleted) return null;

    const next = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.isActive, true)))
      .orderBy(desc(addresses.createdAt))
      .limit(1);
    const nextId = next[0]?.id ?? null;
    if (nextId) {
      await tx
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, nextId));
    }
    await tx
      .update(users)
      .set({ defaultAddressId: nextId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return deleted;
  });
}

export async function setDefaultAddress(
  db: DB,
  userId: string,
  id: string,
): Promise<Address | null> {
  return db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(
        and(
          eq(addresses.id, id),
          eq(addresses.userId, userId),
          eq(addresses.isActive, true),
        ),
      )
      .limit(1);
    if (!owned[0]) return null;

    await tx
      .update(addresses)
      .set({ isDefault: false })
      .where(and(eq(addresses.userId, userId), eq(addresses.isActive, true)));

    const rows = await tx
      .update(addresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();

    await tx
      .update(users)
      .set({ defaultAddressId: id, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return rows[0] ?? null;
  });
}
