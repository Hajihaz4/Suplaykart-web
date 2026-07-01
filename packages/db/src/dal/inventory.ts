import { and, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "../client";
import { inventory, inventoryMovements } from "../schema";

/**
 * Minimal query surface shared by the top-level `db` and a transaction `tx`
 * (both inherit these from PgDatabase), so inventory ops compose inside the
 * order-creation transaction.
 */
export type Executor = Pick<DB, "select" | "insert" | "update">;

export class OutOfStockError extends Error {
  constructor(public variantId: string) {
    super("Out of stock");
    this.name = "OutOfStockError";
  }
}

/** available = quantity_on_hand − quantity_reserved, per variant. */
export async function listAvailability(
  db: DB,
  variantIds: string[],
): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};
  const rows = await db
    .select({
      variantId: inventory.variantId,
      available: sql<number>`(${inventory.quantityOnHand} - ${inventory.quantityReserved})::int`,
    })
    .from(inventory)
    .where(inArray(inventory.variantId, variantIds));
  const out: Record<string, number> = {};
  for (const r of rows) out[r.variantId] = r.available;
  return out;
}

/**
 * Atomic reserve-on-place. The conditional UPDATE only succeeds when enough
 * stock is available, so concurrent orders cannot oversell (0 rows → throw).
 */
export async function reserveStock(
  exec: Executor,
  supplierId: string,
  variantId: string,
  qty: number,
  orderId: string,
): Promise<void> {
  const res = await exec
    .update(inventory)
    .set({ quantityReserved: sql`${inventory.quantityReserved} + ${qty}` })
    .where(
      and(
        eq(inventory.variantId, variantId),
        sql`${inventory.quantityOnHand} - ${inventory.quantityReserved} >= ${qty}`,
      ),
    )
    .returning({ id: inventory.id });
  if (res.length === 0) throw new OutOfStockError(variantId);
  await exec.insert(inventoryMovements).values({
    variantId,
    supplierId,
    type: "reserve",
    quantityDelta: qty,
    orderId,
  });
}

/** Release reserved stock when an order is cancelled before delivery. */
export async function releaseStock(
  exec: Executor,
  supplierId: string,
  variantId: string,
  qty: number,
  orderId: string,
): Promise<void> {
  await exec
    .update(inventory)
    .set({ quantityReserved: sql`${inventory.quantityReserved} - ${qty}` })
    .where(
      and(
        eq(inventory.variantId, variantId),
        sql`${inventory.quantityReserved} >= ${qty}`,
      ),
    );
  await exec.insert(inventoryMovements).values({
    variantId,
    supplierId,
    type: "release",
    quantityDelta: -qty,
    orderId,
  });
}

/** Commit a sale on delivery: on_hand −= qty and reserved −= qty. */
export async function commitSale(
  exec: Executor,
  supplierId: string,
  variantId: string,
  qty: number,
  orderId: string,
): Promise<void> {
  await exec
    .update(inventory)
    .set({
      quantityOnHand: sql`${inventory.quantityOnHand} - ${qty}`,
      quantityReserved: sql`${inventory.quantityReserved} - ${qty}`,
    })
    .where(
      and(
        eq(inventory.variantId, variantId),
        sql`${inventory.quantityReserved} >= ${qty}`,
        sql`${inventory.quantityOnHand} >= ${qty}`,
      ),
    );
  await exec.insert(inventoryMovements).values({
    variantId,
    supplierId,
    type: "sale",
    quantityDelta: -qty,
    orderId,
  });
}

/** Admin stock change (restock / correction). Records the acting user. */
export async function adjustStock(
  exec: Executor,
  supplierId: string,
  variantId: string,
  delta: number,
  actorUserId: string,
  reason?: string,
): Promise<void> {
  await exec
    .update(inventory)
    .set({ quantityOnHand: sql`${inventory.quantityOnHand} + ${delta}` })
    .where(eq(inventory.variantId, variantId));
  await exec.insert(inventoryMovements).values({
    variantId,
    supplierId,
    type: delta >= 0 ? "restock" : "adjust",
    quantityDelta: delta,
    reason: reason ?? null,
    actorUserId,
  });
}
