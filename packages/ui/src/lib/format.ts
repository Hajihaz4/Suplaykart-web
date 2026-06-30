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
