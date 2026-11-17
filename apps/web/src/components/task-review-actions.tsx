"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TaskReviewActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function decide(decision: "APPROVED" | "CHANGES_REQUESTED") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/review`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, feedback }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "The review could not be saved."); return; }
      router.refresh();
    } catch { setError("Could not reach the server. Your review was not saved."); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="task-review-title" className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
    <h2 id="task-review-title" className="text-xs font-semibold">Review task completion</h2>
    <label className="mt-3 block text-[10px] font-medium text-slate-600">Feedback <textarea value={feedback} onChange={event => setFeedback(event.target.value)} maxLength={2000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" placeholder="Optional feedback for the assignee"/></label>
    {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => decide("APPROVED")} className="min-h-9 rounded-lg bg-emerald-700 px-3 text-[11px] font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Approve and complete"}</button><button type="button" disabled={busy} onClick={() => decide("CHANGES_REQUESTED")} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 disabled:opacity-50">Request changes</button></div>
  </section>;
}
