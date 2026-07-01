"use client";
import * as React from "react";
import { Bell, BellOff } from "lucide-react";
import {
  subscribePushAction,
  unsubscribePushAction,
  updatePreferencesAction,
} from "@/app/account/notifications/actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface Prefs {
  push: boolean;
  promotional: boolean;
  storeStatus: boolean;
  whatsapp: boolean;
}

export function NotificationSettings({ prefs }: { prefs: Prefs }) {
  const [enabled, setEnabled] = React.useState(false);
  const [supported, setSupported] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (!VAPID) return;
    setBusy(true);
    setNote(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNote("Notifications were blocked in your browser.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      });
      const res = await subscribePushAction(
        sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } },
        navigator.userAgent,
      );
      if (res.ok) {
        setEnabled(true);
        await updatePreferencesAction({ push: true });
      }
    } catch {
      setNote("Could not enable push on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      await updatePreferencesAction({ push: false });
    } finally {
      setBusy(false);
    }
  }

  const savePref = (patch: Partial<Prefs>) => {
    void updatePreferencesAction(patch);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border-light bg-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {enabled ? (
              <Bell className="size-4 text-brand" />
            ) : (
              <BellOff className="size-4 text-muted" />
            )}
            <span className="text-sm font-bold text-ink">Push notifications</span>
          </div>
          {!VAPID ? (
            <span className="text-2xs font-semibold text-muted">
              Not configured
            </span>
          ) : !supported ? (
            <span className="text-2xs font-semibold text-muted">
              Not supported
            </span>
          ) : (
            <button
              disabled={busy}
              onClick={() => (enabled ? disable() : enable())}
              className={`rounded-lg px-3 py-1.5 text-2xs font-bold disabled:opacity-50 ${
                enabled
                  ? "border border-danger/40 text-danger"
                  : "bg-brand text-white"
              }`}
            >
              {busy ? "…" : enabled ? "Turn off" : "Enable on this device"}
            </button>
          )}
        </div>
        {note ? <p className="mt-2 text-2xs text-danger">{note}</p> : null}
      </div>

      <div className="divide-y divide-border-light rounded-xl border border-border-light bg-surface">
        <Toggle
          label="Promotional offers"
          defaultChecked={prefs.promotional}
          onChange={(v) => savePref({ promotional: v })}
        />
        <Toggle
          label="Store status updates"
          defaultChecked={prefs.storeStatus}
          onChange={(v) => savePref({ storeStatus: v })}
        />
        <Toggle
          label="WhatsApp updates"
          defaultChecked={prefs.whatsapp}
          onChange={(v) => savePref({ whatsapp: v })}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  defaultChecked,
  onChange,
}: {
  label: string;
  defaultChecked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-brand"
      />
    </label>
  );
}
