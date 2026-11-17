"use client";

import { useState } from "react";

export function AttendanceActions({ open, breakOpen }: { open: boolean; breakOpen: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function run(action: "check-in" | "check-out" | "break/start" | "break/end") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(`/api/v1/attendance/${action}`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(true);
        setMessage(body?.error?.message ?? "Could not update attendance. Try again.");
        return;
      }
      setMessage(action === "check-in" ? "You’re checked in." : action === "check-out" ? "Your shift is checked out." : action === "break/start" ? "Your break has started." : "Your break has ended.");
      location.reload();
    } catch {
      setError(true);
      setMessage("Could not reach the server. Your attendance was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => run(open ? "check-out" : "check-in")} className={`min-h-10 rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50 ${open ? "bg-slate-700 hover:bg-slate-800" : "bg-[#f46327] hover:bg-[#c74410]"}`}>{busy ? "Saving…" : open ? "Check out" : "Check in"}</button>
      {open && <button type="button" disabled={busy} onClick={() => run(breakOpen ? "break/end" : "break/start")} className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy ? "Saving…" : breakOpen ? "End break" : "Start break"}</button>}
    </div>
    {message && <p role={error ? "alert" : "status"} aria-live="polite" className={`mt-2 text-xs ${error ? "text-rose-600" : "text-slate-500"}`}>{message}</p>}
  </div>;
}
