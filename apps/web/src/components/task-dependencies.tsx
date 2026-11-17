"use client";

import Link from "next/link";
import { useState } from "react";

type Dependency = { id: string; direction: "BLOCKED_BY" | "BLOCKS"; task: { id: string; title: string; status: string } };
type Candidate = { id: string; title: string; status: string };
export function TaskDependencies({ taskId, initial, candidates, canManage }: { taskId: string; initial: Dependency[]; candidates: Candidate[]; canManage: boolean }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function mutate(id: string, action: "add" | "remove") {
    if (busy || (action === "add" && !id)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(action === "add" ? `/api/v1/tasks/${taskId}/dependencies` : `/api/v1/tasks/${taskId}/dependencies/${id}`, { method: action === "add" ? "POST" : "DELETE", ...(action === "add" ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ dependsOnTaskId: id }) } : {}) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? `Could not ${action} dependency.`); return; }
      if (action === "add") {
        const candidate = candidates.find((item) => item.id === id);
        if (candidate) setItems((current) => current.some((item) => item.direction === "BLOCKED_BY" && item.task.id === id) ? current : [...current, { id: result.data.id, direction: "BLOCKED_BY", task: candidate }]);
        setSelected("");
      } else setItems((current) => current.filter((item) => !(item.direction === "BLOCKED_BY" && item.task.id === id)));
    } catch { setError(`Could not reach the server. The dependency was not ${action === "add" ? "added" : "removed"}.`); }
    finally { setBusy(false); }
  }

  const blockedBy = items.filter((item) => item.direction === "BLOCKED_BY");
  const blocking = items.filter((item) => item.direction === "BLOCKS");
  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Dependencies</h2><p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Blocked by</p>{blockedBy.length ? blockedBy.map((item) => <div key={item.id} className="mt-2 flex items-center justify-between gap-2"><Link href={`/tasks/${item.task.id}`} className="truncate text-xs text-indigo-600 hover:underline">{item.task.title} · {item.task.status.replaceAll("_", " ")}</Link>{canManage && <button type="button" disabled={busy} onClick={() => mutate(item.task.id, "remove")} className="text-[10px] text-slate-400 hover:text-rose-600 disabled:opacity-50">Remove</button>}</div>) : <p className="mt-1 text-xs text-slate-400">None</p>}<p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Blocking</p>{blocking.length ? blocking.map((item) => <Link key={item.id} href={`/tasks/${item.task.id}`} className="mt-2 block truncate text-xs text-indigo-600 hover:underline">{item.task.title} · {item.task.status.replaceAll("_", " ")}</Link>) : <p className="mt-1 text-xs text-slate-400">None</p>}{canManage && <div className="mt-4 flex gap-2"><label className="sr-only" htmlFor="task-dependency">Choose a task this task depends on</label><select id="task-dependency" value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs"><option value="">Choose dependency</option>{candidates.filter((candidate) => !blockedBy.some((item) => item.task.id === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select><button type="button" disabled={!selected || busy} onClick={() => mutate(selected, "add")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Add"}</button></div>}{error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}</section>;
}
