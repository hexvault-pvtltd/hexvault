"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Department = { id: string; name: string; active: boolean };
type Team = { id: string; name: string; departmentId: string; active: boolean };
export function DepartmentTeamFields({ initialDepartmentId = "", initialTeamIds = [], disabled = false, project = false, onReadyChange }: { initialDepartmentId?: string; initialTeamIds?: string[]; disabled?: boolean; project?: boolean; onReadyChange: (ready: boolean) => void }) {
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [teamIds, setTeamIds] = useState(initialTeamIds);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); onReadyChange(false);
    async function load(url: string) {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to load departments and teams.");
      return body.data.items;
    }
    Promise.all([load("/api/v1/departments"), load("/api/v1/teams")]).then(([departmentItems, teamItems]) => {
      if (!controller.signal.aborted) { setDepartments(departmentItems); setTeams(teamItems); setError(""); onReadyChange(true); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load organization options."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, onReadyChange]);
  const availableTeams = teams.filter(team => team.departmentId === departmentId && (team.active || teamIds.includes(team.id)));
  return <fieldset className="space-y-3 rounded-xl border border-slate-100 p-4" disabled={disabled || loading}>
    <legend className="px-1 text-xs font-semibold">Department and teams</legend>
    {loading && <p role="status" className="text-xs text-slate-500">Loading departments and teams...</p>}
    {error && <div role="alert" className="text-xs text-rose-600"><p>{error}</p><button type="button" disabled={false} onClick={() => { setLoading(true); setReload(value => value + 1); }} className="mt-2 underline">Reload options</button></div>}
    {!loading && !error && <>
      <label className="block text-xs font-semibold">Department<select name="departmentId" value={departmentId} onChange={event => { setDepartmentId(event.target.value); setTeamIds([]); }} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">No department</option>{departments.filter(department => department.active || department.id === initialDepartmentId).map(department => <option key={department.id} value={department.id}>{department.name}{department.active ? "" : " (inactive)"}</option>)}</select></label>
      <div><p className="text-xs font-semibold">{project ? "Development teams" : "Teams"}</p>{departmentId ? availableTeams.length ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{availableTeams.map(team => <label key={team.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs"><input type="checkbox" name="teamIds" value={team.id} checked={teamIds.includes(team.id)} onChange={event => setTeamIds(current => event.target.checked ? [...current, team.id] : current.filter(id => id !== team.id))}/>{team.name}{!team.active ? " (inactive)" : ""}</label>)}</div> : <p className="mt-2 text-xs text-slate-500">No active teams in this department. <Link href="/teams" className="underline">Manage teams</Link></p> : <p className="mt-2 text-xs text-slate-500">Choose a department to see its teams.</p>}</div>
      <p className="text-[11px] leading-5 text-slate-500">{project ? "Current active members of the selected teams will join this project. Future team changes do not automatically change project membership." : "Select one or more teams in this department. Changing the department clears the team selection."}</p>
      {!departments.some(department => department.active) && <p className="text-xs text-slate-500"><Link href="/departments" className="underline">Create a department</Link> to organize employees and teams.</p>}
    </>}
  </fieldset>;
}
