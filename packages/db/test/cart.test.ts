import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addToCart,
  clearCart,
  getCartCount,
  getCartItems,
  getCartView,
  removeFromCart,
  updateCartQuantity,
} from "../src/dal/cart";
import {
  type TestDb,
  makeCategory,
  makeProduct,
  makeSupplier,
  makeTestDb,
  makeUser,
} from "./harness";

describe("cart DAL", () => {
  let t: TestDb;
  let A: string;
  let B: string;
  let v1: string;
  let v2: string;

  beforeAll(async () => {
    t = await makeTestDb();
    const sup = await makeSupplier(t.db);
    const cat = await makeCategory(t.db, sup);
    v1 = (
      await makeProduct(t.db, {
        supplierId: sup,
        categoryId: cat,
        slug: "p1",
        price: 5000,
        mrp: 6000,
      })
    ).variantId;
    v2 = (
      await makeProduct(t.db, {
        supplierId: sup,
        categoryId: cat,
        slug: "p2",
        price: 10000,
        mrp: 10000,
      })
    ).variantId;
    A = await makeUser(t.db);
    B = await makeUser(t.db);
  });
  afterAll(() => t.close());

  it("adds and increments the same variant", async () => {
    await addToCart(t.db, A, v1, 1);
    await addToCart(t.db, A, v1, 1);
    const items = await getCartItems(t.db, A);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(2);
  });

  it("computes count, subtotal and savings", async () => {
    await addToCart(t.db, A, v2, 3);
    expect(await getCartCount(t.db, A)).toBe(5);
    const view = await getCartView(t.db, A);
    expect(view.subtotal).toBe(5000 * 2 + 10000 * 3);
    expect(view.savings).toBe((6000 - 5000) * 2);
  });

  it("updates quantity and removes on zero", async () => {
    await updateCartQuantity(t.db, A, v1, 5);
    await updateCartQuantity(t.db, A, v2, 0);
    const items = await getCartItems(t.db, A);
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(5);
  });

  it("isolates carts per user", async () => {
    await addToCart(t.db, B, v2, 1);
    expect(await getCartCount(t.db, A)).toBe(5);
    expect(await getCartCount(t.db, B)).toBe(1);
  });

  it("removes and clears", async () => {
    await removeFromCart(t.db, A, v1);
    expect(await getCartCount(t.db, A)).toBe(0);
    await addToCart(t.db, A, v1, 2);
    await clearCart(t.db, A);
    expect(await getCartCount(t.db, A)).toBe(0);
    expect(await getCartCount(t.db, B)).toBe(1);
  });
});
