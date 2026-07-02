/** Small pure helpers for the WP → Suplaykart ETL. */

/** Parse a WooCommerce rupee string ("38.00") into integer paise, or null. */
export function toPaise(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).replace(/^'/, "").trim(); // WebToffee Excel-guard prefix
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Parse an integer-ish string (stock etc.), tolerating the `'` prefix. */
export function toInt(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).replace(/^'/, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/**
 * Normalize an Indian phone number to 10 digits (starting 6-9), else null.
 * Handles +91 / 91 / leading-0 forms.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(-10);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** Sanitize a WP post_name / term slug into our slug format. */
export function toSlug(raw: string | null | undefined, fallback: string): string {
  let s = raw ?? "";
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep as-is */
  }
  s = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback;
}

/** Strip HTML tags/entities from post_content for a plain description. */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const s = html
    .replace(/<\/?(p|br|li|div|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s || null;
}

/** Prettify a WP attribute slug value ("1-litre" → "1 Litre"). */
export function prettyLabel(v: string): string {
  return v
    .split("-")
    .filter(Boolean)
    .map((w) => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** UTC timestamp string from a MySQL datetime ("2025-01-01 14:26:02"). */
export function toUtcDate(v: string | null | undefined): Date | null {
  if (!v || v.startsWith("0000")) return null;
  const d = new Date(v.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}
