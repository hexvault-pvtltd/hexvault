"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
type Project = { id: string; code: string; name: string; description: string | null; status: string; startDate: string | null; dueDate: string | null };
export function ProjectSettingsForm({ project }: { project: Project }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); const form = new FormData(event.currentTarget); const body = { name: String(form.get("name")), description: String(form.get("description")??"") || null, status: String(form.get("status")), startDate: String(form.get("startDate")??"") || null, dueDate: String(form.get("dueDate")??"") || null };
    try {
      const response = await fetch(`/api/v1/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not save project settings."); return; }
      router.refresh();
    } catch { setError("Could not reach the server. Project settings were not changed."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <label className="block text-xs font-semibold">Project name<input name="name" required minLength={2} maxLength={160} defaultValue={project.name} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
    <label className="block text-xs font-semibold">Description<textarea name="description" maxLength={4000} rows={4} defaultValue={project.description??""} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
    <div className="grid gap-4 sm:grid-cols-3"><label className="block text-xs font-semibold">Status<select name="status" defaultValue={project.status} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="ACTIVE">Active</option><option value="ON_HOLD">On hold</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></select></label><label className="block text-xs font-semibold">Start date<input name="startDate" type="date" defaultValue={project.startDate??""} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="block text-xs font-semibold">Due date<input name="dueDate" type="date" defaultValue={project.dueDate??""} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label></div>
    {error&&<p role="alert" className="text-xs text-rose-600">{error}</p>}<button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Save settings"}</button>
  </form>;
}
