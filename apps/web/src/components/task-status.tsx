"use client";

import { useState } from "react";

export function TaskStatus({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.currentTarget.value;
    if (busy || next === value) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/tasks/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message ?? "Could not update task status.");
        return;
      }
      setValue(next);
    } catch {
      setError("Could not reach the server. Your task status was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <select aria-label="Task status" value={value} onChange={change} disabled={busy} aria-busy={busy} aria-describedby={error ? `task-status-${id}-error` : undefined} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-600 disabled:opacity-60">
      {["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE", "CANCELLED"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
    </select>
    {error && <span id={`task-status-${id}-error`} role="alert" className="mt-1 block max-w-48 text-[10px] text-rose-600">{error}</span>}
  </div>;
}
