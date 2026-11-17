"use client";

import { FormEvent, useState } from "react";

export function CompanySettingsForm({ name, timezone }: { name: string; timezone: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/v1/settings/company", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(true);
        setMessage(body?.error?.message ?? "Unable to save settings.");
        return;
      }
      setMessage("Company settings saved.");
    } catch {
      setError(true);
      setMessage("Could not reach the server. Settings were not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={save} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"><label className="block text-xs font-semibold">Company display name<input required name="displayName" defaultValue={name} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="block text-xs font-semibold">Company timezone<input required name="timezone" defaultValue={timezone} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/><small className="mt-1 block text-[10px] font-normal text-slate-400">Use an IANA timezone such as Asia/Kolkata.</small></label>{message && <p role={error ? "alert" : "status"} aria-live="polite" className={`text-xs ${error ? "text-rose-600" : "text-slate-500"}`}>{message}</p>}<button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button></form>;
}
