/** Format paise (integer minor units) as a ₹ string. */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees.toString() : rupees.toFixed(2)}`;
}

/** Discount percentage of price vs MRP, or null when there is no discount. */
export function discountPct(mrp: number, price: number): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** "1 Jul, 3:40 PM" — compact date + time. */
export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** "1 Jul 2026" — date only. */
export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
