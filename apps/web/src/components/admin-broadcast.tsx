"use client";
import * as React from "react";
import { Send } from "lucide-react";
import type { NotificationType } from "@suplaykart/db";
import { sendBroadcastAction } from "@/app/admin/notifications/actions";

const inputCls =
  "w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";

export function AdminBroadcast() {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [type, setType] = React.useState<NotificationType>("offer");
  const [promoOnly, setPromoOnly] = React.useState(true);
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const send = () => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    sendBroadcastAction({ title, body, type, promotionalOnly: promoOnly, url })
      .then((r) => {
        if (!r.ok) setErr(r.error ?? "Failed to send.");
        else {
          setMsg(`Sent to ${r.count} customer(s).`);
          setTitle("");
          setBody("");
          setUrl("");
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="max-w-xl space-y-3 rounded-xl border border-border-light bg-surface p-4">
      <h2 className="text-sm font-extrabold text-ink">Send a broadcast</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        maxLength={80}
        className={inputCls}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={3}
        maxLength={300}
        className={inputCls}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as NotificationType)}
          className={inputCls}
        >
          <option value="offer">Offer</option>
          <option value="store">Store update</option>
          <option value="account">Account</option>
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link (optional, e.g. /search?q=…)"
          className={inputCls}
        />
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink">
        <input
          type="checkbox"
          checked={promoOnly}
          onChange={(e) => setPromoOnly(e.target.checked)}
          className="size-4 accent-brand"
        />
        Only customers who allow promotional notifications
      </label>
      {err ? (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand">
          {msg}
        </p>
      ) : null}
      <button
        disabled={busy}
        onClick={send}
        className="flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white disabled:opacity-50"
      >
        <Send className="size-4" /> {busy ? "Sending…" : "Send broadcast"}
      </button>
    </div>
  );
}
