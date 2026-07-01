// Provider-agnostic maps helpers (Mapbox). Client-safe: the token is a public
// NEXT_PUBLIC value used in image/geocoding URLs. Everything degrades to null
// when no token is set, so callers show a graceful fallback.

function token(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || undefined;
}

export function isMapsConfigured(): boolean {
  return !!token();
}

/** Static map image URL centered on a pin, or null when unconfigured. */
export function staticMapUrl(
  lat: number,
  lng: number,
  width = 480,
  height = 200,
  zoom = 14,
): string | null {
  const t = token();
  if (!t) return null;
  const pin = `pin-l+0c831f(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${t}`;
}

export interface ReverseGeoResult {
  formatted: string | null;
  city: string | null;
  pincode: string | null;
  area: string | null;
}

/** Reverse-geocode coordinates to an address. Returns null when unconfigured. */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeoResult | null> {
  const t = token();
  if (!t) return null;
  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${t}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      features?: {
        properties?: {
          full_address?: string;
          name?: string;
          context?: Record<string, { name?: string } | undefined>;
        };
      }[];
    };
    const props = json.features?.[0]?.properties;
    if (!props) return { formatted: null, city: null, pincode: null, area: null };
    const ctx = props.context ?? {};
    return {
      formatted: props.full_address ?? props.name ?? null,
      city: ctx.place?.name ?? ctx.locality?.name ?? null,
      pincode: ctx.postcode?.name ?? null,
      area: ctx.neighborhood?.name ?? ctx.locality?.name ?? null,
    };
  } catch {
    return null;
  }
}
