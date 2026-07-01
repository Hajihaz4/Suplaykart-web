import { pgEnum } from "drizzle-orm/pg-core";

// §2 / §3 — customer + staff roles
export const userRole = pgEnum("user_role", [
  "customer",
  "support",
  "ops",
  "admin",
  "owner",
]);

// §1.4 — address label
export const addressLabel = pgEnum("address_label", ["home", "work", "other"]);

// §5 — inventory ledger movement type
export const inventoryMovementType = pgEnum("inventory_movement_type", [
  "restock",
  "reserve",
  "release",
  "sale",
  "adjust",
  "return",
]);

// §1.6 — coupon type
export const couponType = pgEnum("coupon_type", ["percent", "flat"]);

// §4 — order state machine (returned is Phase-2; added then)
export const orderStatus = pgEnum("order_status", [
  "placed",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

// §6 — payment method (no live gateway in Phase-1)
export const paymentMethod = pgEnum("payment_method", [
  "cod",
  "upi_on_delivery",
]);

// Phase 2I — payment provider for the payment record (gateway-ready)
export const paymentProvider = pgEnum("payment_provider", [
  "cod",
  "upi_on_delivery",
  "razorpay",
]);

// §1.7 — payment status (refunded/failed reserved for Phase-2)
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "collected",
  "refunded",
  "failed",
]);

// §4 — who performed an action
export const actorType = pgEnum("actor_type", ["system", "customer", "staff"]);

// §1.8 — serviceability
export const serviceStatus = pgEnum("service_status", ["live", "coming_soon"]);

// §1.8 / Phase 2C — how the store decides serviceability
export const serviceabilityMode = pgEnum("serviceability_mode", [
  "all", // serve everywhere (default; unrestricted)
  "pincode", // only `live` serviceable-area pincodes
  "radius", // within delivery radius of the store origin (falls back to pincode without coords)
]);

// §1.8 — notification category
export const notificationType = pgEnum("notification_type", [
  "order",
  "delivery",
  "offer",
  "store",
  "account",
  "refund",
  "weather",
]);
