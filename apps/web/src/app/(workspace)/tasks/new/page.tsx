"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTask() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    const body = { ...fields, ...(projectId ? { projectId } : {}), dueAt: fields.dueAt ? new Date(`${fields.dueAt}T12:00:00`).toISOString() : undefined };
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message ?? "Could not create task.");
        return;
      }
      router.push(projectId ? `/projects/${projectId}` : "/tasks");
    } catch {
      setError("Could not reach the server. The task was not created.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="max-w-2xl"><p className="text-xs text-slate-400">Workspace / Tasks / New</p><h1 className="mt-2 text-2xl font-semibold">Create a task</h1><form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"><label className="block text-xs font-semibold">Task title<input name="title" required minLength={2} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="block text-xs font-semibold">Description<textarea name="description" rows={3} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Priority<select name="priority" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option>MEDIUM</option><option>LOW</option><option>HIGH</option><option>URGENT</option></select></label><label className="block text-xs font-semibold">Due date<input name="dueAt" type="date" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label></div>{error && <p role="alert" className="text-xs text-rose-600">{error}</p>}<button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Create task"}</button></form></div>;
}
