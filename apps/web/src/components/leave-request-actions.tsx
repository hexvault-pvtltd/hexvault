"use client";

import { useState } from "react";

export function LeaveRequestActions({ id, status, canReview, canCancel }: { id: string; status: string; canReview: boolean; canCancel: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(path: string, body?: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, { method: "POST", ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message ?? "Unable to update request.");
        return;
      }
      location.reload();
    } catch {
      setError("Could not reach the server. The leave request was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-wrap gap-2">{canReview && status === "PENDING" && <><button type="button" disabled={busy} onClick={() => run(`/api/v1/leave/requests/${id}/decision`, { decision: "APPROVED" })} className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50">Approve</button><button type="button" disabled={busy} onClick={() => run(`/api/v1/leave/requests/${id}/decision`, { decision: "REJECTED" })} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50">Reject</button></>}{canCancel && ["PENDING", "APPROVED"].includes(status) && <button type="button" disabled={busy} onClick={() => run(`/api/v1/leave/requests/${id}/cancel`)} className="rounded-md border border-rose-200 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 disabled:opacity-50">Cancel</button>}{error && <small role="alert" className="basis-full text-rose-600">{error}</small>}</div>;
}
