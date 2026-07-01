"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { ServiceMode, ServiceStatus } from "@suplaykart/db";
import {
  bulkAddPincodesAction,
  createAreaAction,
  deleteAreaAction,
  saveServiceConfigAction,
  toggleAreaAction,
  updateAreaAction,
} from "@/app/admin/serviceability/actions";

const inputCls =
  "w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

export interface AreaRow {
  id: string;
  pincode: string;
  city: string;
  areaName: string | null;
  status: ServiceStatus;
  isActive: boolean;
}
export interface Config {
  mode: ServiceMode;
  originLat: number | null;
  originLng: number | null;
  radiusKm: number;
}

export function AdminServiceability({
  config,
  areas,
}: {
  config: Config;
  areas: AreaRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const refresh = () => router.refresh();

  const run = (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    fn()
      .then(refresh)
      .finally(() => setBusy(false));
  };
  const runResult = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    setError(null);
    fn()
      .then((r) => {
        if (!r.ok) setError(r.error ?? "Something went wrong.");
        else refresh();
      })
      .finally(() => setBusy(false));
  };

  // ── config form state ──
  const [mode, setMode] = React.useState<ServiceMode>(config.mode);
  const [lat, setLat] = React.useState(config.originLat?.toString() ?? "");
  const [lng, setLng] = React.useState(config.originLng?.toString() ?? "");
  const [radius, setRadius] = React.useState(config.radiusKm.toString());

  // ── add-area form state ──
  const [pincode, setPincode] = React.useState("");
  const [city, setCity] = React.useState("Nagore");
  const [areaName, setAreaName] = React.useState("");
  const [status, setStatus] = React.useState<ServiceStatus>("live");
  const [launch, setLaunch] = React.useState("");

  // ── bulk state ──
  const [bulk, setBulk] = React.useState("");
  const [bulkCity, setBulkCity] = React.useState("Nagore");
  const [bulkStatus, setBulkStatus] = React.useState<ServiceStatus>("live");

  return (
    <div className="space-y-5 p-4 md:p-6">
      {error ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {/* mode / radius config */}
      <section className="rounded-xl border border-border-light bg-surface p-4">
        <h2 className="text-sm font-extrabold text-ink">Serviceability mode</h2>
        <p className="mt-0.5 text-2xs text-muted">
          <b>All</b>: serve everywhere · <b>Pincode</b>: only listed live
          pincodes · <b>Radius</b>: within delivery radius (uses address
          coordinates once the map picker is live; falls back to pincodes).
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-2xs font-bold uppercase text-muted">
              Mode
            </span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ServiceMode)}
              className={inputCls}
            >
              <option value="all">All (unrestricted)</option>
              <option value="pincode">Pincode list</option>
              <option value="radius">Delivery radius</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-2xs font-bold uppercase text-muted">
              Origin lat
            </span>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="10.82"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-2xs font-bold uppercase text-muted">
              Origin lng
            </span>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="79.84"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-2xs font-bold uppercase text-muted">
              Radius (km)
            </span>
            <input
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              inputMode="numeric"
              className={inputCls}
            />
          </label>
        </div>
        <button
          disabled={busy}
          onClick={() =>
            runResult(() =>
              saveServiceConfigAction({
                mode,
                originLat: lat,
                originLng: lng,
                radiusKm: radius,
              }),
            )
          }
          className="mt-3 h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save mode
        </button>
      </section>

      {/* add pincode */}
      <section className="rounded-xl border border-border-light bg-surface p-4">
        <h2 className="text-sm font-extrabold text-ink">Add serviceable area</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <input
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="Pincode"
            inputMode="numeric"
            className={inputCls}
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className={inputCls}
          />
          <input
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Area (optional)"
            className={inputCls}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ServiceStatus)}
            className={inputCls}
          >
            <option value="live">Live</option>
            <option value="coming_soon">Coming soon</option>
          </select>
          <input
            value={launch}
            onChange={(e) => setLaunch(e.target.value)}
            placeholder="Launch (opt)"
            className={inputCls}
          />
        </div>
        <button
          disabled={busy}
          onClick={() =>
            runResult(async () => {
              const r = await createAreaAction({
                pincode,
                city,
                areaName,
                status,
                expectedLaunch: launch,
              });
              if (r.ok) {
                setPincode("");
                setAreaName("");
                setLaunch("");
              }
              return r;
            })
          }
          className="mt-3 flex h-10 items-center gap-1.5 rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus className="size-4" /> Add area
        </button>
      </section>

      {/* bulk add */}
      <section className="rounded-xl border border-border-light bg-surface p-4">
        <h2 className="text-sm font-extrabold text-ink">Bulk add pincodes</h2>
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={2}
          placeholder="611002, 611001 611003 …"
          className={`${inputCls} mt-3`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={bulkCity}
            onChange={(e) => setBulkCity(e.target.value)}
            placeholder="City"
            className={`${inputCls} max-w-40`}
          />
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as ServiceStatus)}
            className={`${inputCls} max-w-40`}
          >
            <option value="live">Live</option>
            <option value="coming_soon">Coming soon</option>
          </select>
          <button
            disabled={busy}
            onClick={() =>
              runResult(async () => {
                const r = await bulkAddPincodesAction({
                  pincodesRaw: bulk,
                  city: bulkCity,
                  status: bulkStatus,
                });
                if (r.ok) setBulk("");
                return r;
              })
            }
            className="h-10 rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            Bulk add
          </button>
        </div>
      </section>

      {/* areas table */}
      <section className="overflow-x-auto rounded-xl border border-border-light bg-surface">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-light text-2xs uppercase text-muted">
              <th className="px-4 py-3 font-bold">Pincode</th>
              <th className="px-4 py-3 font-bold">City / Area</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {areas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No serviceable areas yet.
                </td>
              </tr>
            ) : (
              areas.map((a) => (
                <tr key={a.id} className="hover:bg-surface-alt">
                  <td className="px-4 py-3 font-bold text-ink">{a.pincode}</td>
                  <td className="px-4 py-3 text-muted">
                    {a.city}
                    {a.areaName ? ` · ${a.areaName}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busy}
                      onClick={() =>
                        runResult(() =>
                          updateAreaAction(a.id, {
                            pincode: a.pincode,
                            city: a.city,
                            areaName: a.areaName ?? undefined,
                            status:
                              a.status === "live" ? "coming_soon" : "live",
                          }),
                        )
                      }
                      className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                        a.status === "live"
                          ? "bg-brand-light text-brand"
                          : "bg-warning-light text-warning"
                      }`}
                      title="Toggle live / coming-soon"
                    >
                      {a.status === "live" ? "Live" : "Coming soon"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => toggleAreaAction(a.id, !a.isActive))
                      }
                      className="text-2xs font-bold text-muted hover:text-ink"
                    >
                      {a.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled={busy}
                      onClick={() => run(() => deleteAreaAction(a.id))}
                      title="Delete"
                      className="grid size-7 place-items-center rounded-lg text-danger hover:opacity-80"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
