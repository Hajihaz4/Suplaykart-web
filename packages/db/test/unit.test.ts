import { describe, expect, it } from "vitest";
import {
  canTransition,
  deliveryFeeFor,
  isCancellable,
} from "../src/dal/orders";

describe("order state machine", () => {
  it("allows the forward path", () => {
    expect(canTransition("placed", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "packed")).toBe(true);
    expect(canTransition("packed", "out_for_delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered")).toBe(true);
  });

  it("rejects skips and backward moves", () => {
    expect(canTransition("placed", "delivered")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "placed")).toBe(false);
    expect(canTransition("out_for_delivery", "cancelled")).toBe(false);
  });

  it("permits cancellation only before dispatch", () => {
    expect(isCancellable("placed")).toBe(true);
    expect(isCancellable("confirmed")).toBe(true);
    expect(isCancellable("packed")).toBe(true);
    expect(isCancellable("out_for_delivery")).toBe(false);
    expect(isCancellable("delivered")).toBe(false);
    expect(isCancellable("cancelled")).toBe(false);
  });
});

describe("delivery pricing", () => {
  it("charges below the free threshold and is free at/above it", () => {
    expect(deliveryFeeFor(0)).toBe(2500);
    expect(deliveryFeeFor(19999)).toBe(2500);
    expect(deliveryFeeFor(20000)).toBe(0);
    expect(deliveryFeeFor(50000)).toBe(0);
  });
});
