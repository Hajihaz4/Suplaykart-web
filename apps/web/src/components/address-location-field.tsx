"use client";
import * as React from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { staticMapUrl } from "@/lib/maps";
import { reverseGeocodeAction } from "@/app/account/addresses/actions";

export function AddressLocationField({
  defaultLat,
  defaultLng,
}: {
  defaultLat?: string | null;
  defaultLng?: string | null;
}) {
  const [lat, setLat] = React.useState(defaultLat ?? "");
  const [lng, setLng] = React.useState(defaultLng ?? "");
  const [busy, setBusy] = React.useState(false);
  const [hint, setHint] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const hasCoords = lat !== "" && lng !== "";
  const mapUrl = hasCoords ? staticMapUrl(Number(lat), Number(lng)) : null;

  function locate() {
    setErr(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErr("Geolocation isn't available on this device.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude.toFixed(6);
        const ln = pos.coords.longitude.toFixed(6);
        setLat(la);
        setLng(ln);
        try {
          const geo = await reverseGeocodeAction(Number(la), Number(ln));
          if (geo?.formatted) setHint(geo.formatted);
        } catch {
          /* reverse-geo is best-effort */
        }
        setBusy(false);
      },
      () => {
        setErr("Couldn't get your location — check browser permissions.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="rounded-xl border border-border-light bg-surface p-3">
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <MapPin className="size-4 text-brand" /> Delivery location
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={locate}
          className="flex items-center gap-1.5 rounded-lg bg-brand-light px-3 py-1.5 text-2xs font-bold text-brand disabled:opacity-50"
        >
          <LocateFixed className="size-3.5" />
          {busy ? "Locating…" : "Use my location"}
        </button>
      </div>

      {hasCoords ? (
        <div className="mt-2">
          {mapUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapUrl}
              alt="Selected location"
              className="w-full rounded-lg"
            />
          ) : (
            <div className="rounded-lg bg-surface-alt px-3 py-2 text-2xs font-semibold text-muted">
              📍 {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
            </div>
          )}
          {hint ? (
            <p className="mt-1 text-2xs text-muted">Near: {hint}</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setLat("");
              setLng("");
              setHint(null);
            }}
            className="mt-1 text-2xs font-semibold text-danger"
          >
            Clear location
          </button>
        </div>
      ) : (
        <p className="mt-1 text-2xs text-muted">
          Pin your exact spot for accurate delivery &amp; serviceability
          (optional).
        </p>
      )}
      {err ? <p className="mt-1 text-2xs text-danger">{err}</p> : null}
    </div>
  );
}
