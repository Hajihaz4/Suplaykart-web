import { describe, expect, it } from "vitest";
import { discountPct, formatDate, formatINR } from "../src/lib/format";
import { ORDER_STATUS_META } from "../src/app/order-status-badge";

describe("formatINR", () => {
  it("formats whole and fractional rupees from paise", () => {
    expect(formatINR(5000)).toBe("₹50");
    expect(formatINR(4999)).toBe("₹49.99");
    expect(formatINR(0)).toBe("₹0");
  });
});

describe("discountPct", () => {
  it("returns the rounded discount or null", () => {
    expect(discountPct(6000, 5000)).toBe(17);
    expect(discountPct(5000, 5000)).toBeNull();
    expect(discountPct(4000, 5000)).toBeNull();
  });
});

describe("formatDate", () => {
  it("formats a date", () => {
    const out = formatDate(new Date("2026-07-01T10:00:00Z"));
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Jul/);
  });
});

describe("order status metadata", () => {
  it("has an entry for every status", () => {
    for (const s of [
      "placed",
      "confirmed",
      "packed",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ] as const) {
      expect(ORDER_STATUS_META[s].label.length).toBeGreaterThan(0);
    }
  });
});
