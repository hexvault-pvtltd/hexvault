"use client";

import { useState } from "react";

type Person = { id: string; fullName: string; employeeCode: string };
export function TaskAssignees({ taskId, people, initial, canManage }: { taskId: string; people: Person[]; initial: Person[]; canManage: boolean }) {
  const [assignees, setAssignees] = useState(initial);
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function mutate(id: string, action: "assign" | "unassign") {
    if (busy || (action === "assign" && !id)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ employeeId: id }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? `Could not ${action} the task.`); return; }
      if (action === "assign") {
        const person = people.find((item) => item.id === id);
        if (person) setAssignees((current) => current.some((item) => item.id === id) ? current : [...current, person]);
        setEmployeeId("");
      } else setAssignees((current) => current.filter((item) => item.id !== id));
    } catch { setError(`Could not reach the server. The task was not ${action === "assign" ? "assigned" : "unassigned"}.`); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Assignees</h2><div className="mt-3 space-y-2">{assignees.length ? assignees.map((person) => <div key={person.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-xs text-slate-700">{person.fullName}<span className="ml-2 text-slate-400">{person.employeeCode}</span></span>{canManage && <button type="button" disabled={busy} onClick={() => mutate(person.id, "unassign")} aria-label={`Unassign ${person.fullName}`} className="text-[10px] text-slate-400 hover:text-rose-600 disabled:opacity-50">Remove</button>}</div>) : <p className="text-xs text-slate-400">Nobody is assigned yet.</p>}</div>{canManage && <div className="mt-4 flex gap-2"><label className="sr-only" htmlFor="task-assignee">Choose an employee</label><select id="task-assignee" value={employeeId} disabled={busy} onChange={(event) => setEmployeeId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs"><option value="">Choose employee</option>{people.filter((person) => !assignees.some((assigned) => assigned.id === person.id)).map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.employeeCode}</option>)}</select><button type="button" disabled={!employeeId || busy} onClick={() => mutate(employeeId, "assign")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Assign"}</button></div>}{error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}</section>;
}
