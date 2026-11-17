"use client";

import { useState } from "react";
type Person = { id: string; fullName: string; employeeCode: string; title: string | null };
type Member = { id: string; projectRole: string; joinedAt: Date | string; employee: Person };

export function ProjectMembers({ projectId, initial, candidates, canManage }: { projectId: string; initial: Member[]; candidates: Person[]; canManage: boolean }) {
  const [members, setMembers] = useState(initial);
  const [employeeId, setEmployeeId] = useState("");
  const [projectRole, setProjectRole] = useState("CONTRIBUTOR");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (busy || !employeeId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/members`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ employeeId, projectRole }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not add project member."); return; }
      const employee = candidates.find((item) => item.id === employeeId);
      if (employee) setMembers((current) => [...current.filter((item) => item.employee.id !== employeeId), { id: result.data.id, projectRole: result.data.projectRole, joinedAt: result.data.joinedAt, employee }]);
      setEmployeeId("");
    } catch { setError("Could not reach the server. The project member was not added."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/members/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not remove project member."); return; }
      setMembers((current) => current.filter((item) => item.employee.id !== id));
    } catch { setError("Could not reach the server. Project membership was not changed."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Project team</h2><span className="text-xs text-slate-400">{members.length} active</span></div><div className="mt-4 divide-y divide-slate-100">{members.length ? members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"><div><p className="text-xs font-medium">{member.employee.fullName}<span className="ml-2 text-slate-400">{member.employee.employeeCode}</span></p><p className="mt-1 text-[10px] text-slate-400">{member.employee.title ?? "Team member"} · {member.projectRole.replaceAll("_", " ")}</p></div>{canManage && <button type="button" disabled={busy} onClick={() => remove(member.employee.id)} className="text-[10px] text-slate-400 hover:text-rose-600 disabled:opacity-50">Remove</button>}</div>) : <p className="py-4 text-xs text-slate-400">No active project members yet.</p>}</div>{canManage && <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto_auto]"><label className="sr-only" htmlFor="project-member">Choose employee</label><select id="project-member" value={employeeId} disabled={busy} onChange={(event) => setEmployeeId(event.target.value)} className="min-w-0 rounded-lg border border-slate-200 px-2 py-2 text-xs"><option value="">Choose active employee</option>{candidates.filter((person) => !members.some((member) => member.employee.id === person.id)).map((person) => <option key={person.id} value={person.id}>{person.fullName} · {person.employeeCode}</option>)}</select><label className="sr-only" htmlFor="project-role">Project role</label><select id="project-role" value={projectRole} disabled={busy} onChange={(event) => setProjectRole(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs"><option value="LEAD">Lead</option><option value="CONTRIBUTOR">Contributor</option><option value="OBSERVER">Observer</option></select><button type="button" disabled={!employeeId || busy} onClick={add} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Add member"}</button></div>}{error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}</section>;
}
