"use client";

import { useState } from "react";

export function NotificationRead({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function read() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error?.message ?? "Unable to mark notification as read.");
        return;
      }
      location.reload();
    } catch {
      setError("Could not reach the server. The notification was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <div><button type="button" disabled={busy} onClick={read} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">{busy ? "Saving…" : "Mark read"}</button>{error && <p role="alert" className="mt-1 text-[10px] text-rose-600">{error}</p>}</div>;
}
