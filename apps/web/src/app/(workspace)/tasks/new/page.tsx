"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Team = { id: string; name: string; department: string; canAssignWholeTeam: boolean; members: { id: string; fullName: string; employeeCode: string }[] };
const fieldClass = "mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400";

export default function NewTask() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState("");
  const [reload, setReload] = useState(0);
  const [mode, setMode] = useState<"UNASSIGNED" | "TEAM" | "MEMBER">("UNASSIGNED");
  const [teamId, setTeamId] = useState("");
  const [memberId, setMemberId] = useState("");
  const team = teams.find(item => item.id === teamId);
  const router = useRouter();
  const projectId = useSearchParams().get("projectId");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/tasks/assignment-options" + (projectId ? "?projectId=" + encodeURIComponent(projectId) : ""), { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message ?? "Could not load teams.");
        if (!controller.signal.aborted) { setTeams(body.data.items); setTeamsError(""); }
      })
      .catch(cause => { if (!controller.signal.aborted) setTeamsError(cause instanceof Error ? cause.message : "Could not load teams."); })
      .finally(() => { if (!controller.signal.aborted) setLoadingTeams(false); });
    return () => controller.abort();
  }, [reload, projectId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (mode !== "UNASSIGNED" && (!team || (mode === "TEAM" ? !team.canAssignWholeTeam : !team.members.some(person => person.id === memberId)))) {
      setError(mode === "TEAM" ? "Choose a team you can assign in full." : "Choose a member of the selected team.");
      return;
    }
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      title: fields.title, description: fields.description, priority: fields.priority,
      ...(projectId ? { projectId } : {}),
      dueAt: fields.dueAt ? new Date(`${fields.dueAt}T12:00:00`).toISOString() : undefined,
      ...(mode !== "UNASSIGNED" ? { teamId, assignWholeTeam: mode === "TEAM", assigneeIds: mode === "MEMBER" ? [memberId] : [] } : {}),
    };
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not create task."); return; }
      router.push(projectId ? `/projects/${projectId}` : "/tasks");
      router.refresh();
    } catch { setError("Could not reach the server. The task was not created."); }
    finally { setBusy(false); }
  }

  return <div className="max-w-2xl">
    <p className="text-xs text-slate-400">Workspace / Tasks / New</p>
    <h1 className="mt-2 text-2xl font-semibold">Create a task</h1>
    <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <label className="block text-xs font-semibold">Task title<input name="title" required minLength={2} maxLength={180} className={fieldClass}/></label>
      <label className="block text-xs font-semibold">Description<textarea name="description" rows={3} maxLength={4000} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold">Priority<select name="priority" className={fieldClass}><option>MEDIUM</option><option>LOW</option><option>HIGH</option><option>URGENT</option></select></label>
        <label className="block text-xs font-semibold">Due date<input name="dueAt" type="date" className={fieldClass}/></label>
      </div>
      <fieldset disabled={busy} className="space-y-4 border-t border-slate-100 pt-4">
        <legend className="pt-3 text-sm font-semibold">Assignment</legend>
        <label className="block text-xs font-semibold">Assign to<select value={mode} className={fieldClass} onChange={event => { setMode(event.target.value as typeof mode); setTeamId(""); setMemberId(""); setError(""); }}><option value="UNASSIGNED">Leave unassigned</option><option value="TEAM">Whole team</option><option value="MEMBER">Specific team member</option></select></label>
        {mode !== "UNASSIGNED" && <>
          {loadingTeams ? <p role="status" className="text-xs text-slate-500">Loading teams...</p> : teamsError ? <div role="alert" className="text-xs text-rose-600"><p>{teamsError}</p><button type="button" className="mt-2 underline" onClick={() => { setLoadingTeams(true); setReload(value => value + 1); }}>Retry loading teams</button></div> : <>
            <label className="block text-xs font-semibold">Team<select value={teamId} required className={fieldClass} onChange={event => { setTeamId(event.target.value); setMemberId(""); }}><option value="">Choose a team</option>{teams.map(item => <option key={item.id} value={item.id} disabled={mode === "TEAM" && !item.canAssignWholeTeam}>{item.name} - {item.department}{mode === "TEAM" && !item.canAssignWholeTeam ? " (specific members only)" : ""}</option>)}</select></label>
            {!teams.length && <p className="text-xs text-slate-500">No active teams are available in your assignment scope.</p>}
            {mode === "MEMBER" && <label className="block text-xs font-semibold">Team member<select value={memberId} required disabled={!team} className={fieldClass} onChange={event => setMemberId(event.target.value)}><option value="">{team ? "Choose a member" : "Choose a team first"}</option>{team?.members.map(person => <option key={person.id} value={person.id}>{person.fullName} - {person.employeeCode}</option>)}</select>{team && !team.members.length && <span className="mt-2 block font-normal text-slate-500">No active members are available in this team.</span>}</label>}
            {mode === "TEAM" && team && <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><p className="font-semibold">{team.members.length} active members will be assigned</p><p className="mt-1 leading-5">{team.members.map(person => person.fullName).join(", ")}</p><p className="mt-2 text-slate-400">Includes the active team lead. Future team membership changes do not change this task&apos;s assignees.</p></div>}
          </>}
        </>}
      </fieldset>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <button disabled={busy || (mode !== "UNASSIGNED" && (loadingTeams || Boolean(teamsError) || !team || (mode === "TEAM" ? !team.canAssignWholeTeam : !memberId)))} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Creating..." : "Create task"}</button>
    </form>
  </div>;
}
