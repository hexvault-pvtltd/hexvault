"use client";

import { FormEvent, useEffect, useState } from "react";

type Note = { id: string; category: string; content: string; followUpAt: string | null; createdAt: string; updatedAt?: string };
type Revision = { id: string; previousContent: string; editedAt: string };

function dateValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ManagementNotes({ employeeId }: { employeeId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [revisions, setRevisions] = useState<Record<string, Revision[]>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const response = await fetch(`/api/v1/employees/${employeeId}/notes`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "Unable to load private notes.");
    setNotes(body.data.items);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/employees/${employeeId}/notes`, { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!active) return;
      if (!response.ok) setError(body.error?.message ?? "Unable to load private notes.");
      else setNotes(body.data.items);
    }).catch(() => { if (active) setError("Unable to load private notes."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId]);

  async function submit(event: FormEvent<HTMLFormElement>, noteId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const content = String(values.content ?? "").trim();
    if (!content) { setError("Enter note content before saving."); return; }
    const followUp = String(values.followUpAt ?? "");
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(noteId ? `/api/v1/notes/${noteId}` : `/api/v1/employees/${employeeId}/notes`, {
        method: noteId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: String(values.category), content, followUpAt: followUp ? new Date(followUp).toISOString() : null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to save the private note.");
      if (!noteId) form.reset();
      setEditing(null); setMessage(noteId ? "Private note updated." : "Private note added.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the private note."); }
    finally { setBusy(false); }
  }

  async function showRevisions(noteId: string) {
    setError("");
    try {
      const response = await fetch(`/api/v1/notes/${noteId}/revisions`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load revision history.");
      setRevisions(current => ({ ...current, [noteId]: body.data.items }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load revision history."); }
  }

  return <div className="space-y-5">
    <div><p className="text-xs text-slate-500">Confidential personnel records</p><h1 className="mt-1 text-2xl font-semibold">Private management notes</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Only active Owners can read or change these notes. Content is encrypted at rest and note access is audited.</p></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <form onSubmit={event => submit(event)} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <label className="text-xs font-semibold">Category<input required name="category" minLength={2} maxLength={60} placeholder="Follow-up, coaching, confidential" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Follow-up (optional)<input name="followUpAt" type="datetime-local" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      <label className="text-xs font-semibold md:col-span-2">Private note<textarea required name="content" minLength={1} maxLength={5000} rows={4} placeholder="Write a factual, work-related note." className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>
      <div className="md:col-span-2"><button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Add private note"}</button></div>
    </form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Note history</h2></div>
      {loading ? <p className="px-5 py-10 text-center text-sm text-slate-400">Loading encrypted notes…</p> : notes.length ? notes.map(note => <article key={note.id} className="border-b border-slate-100 p-5 last:border-0">
        {editing === note.id ? <form onSubmit={event => submit(event, note.id)} className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold">Category<input required name="category" defaultValue={note.category} minLength={2} maxLength={60} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs font-semibold">Follow-up<input name="followUpAt" type="datetime-local" defaultValue={dateValue(note.followUpAt)} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="text-xs font-semibold md:col-span-2">Content<textarea required name="content" defaultValue={note.content} maxLength={5000} rows={5} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>
          <div className="flex gap-2 md:col-span-2"><button disabled={busy} className="rounded-lg bg-[#f46327] px-3 py-2 text-xs font-semibold text-white">Save revision</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">Cancel</button></div>
        </form> : <>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{note.category}</h3><span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">OWNER ONLY</span><time className="ml-auto text-[11px] text-slate-400">{new Date(note.createdAt).toLocaleString()}</time></div>
          {note.followUpAt && <p className="mt-2 text-xs text-amber-700">Follow-up {new Date(note.followUpAt).toLocaleString()}</p>}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.content}</p>
          <div className="mt-4 flex gap-2"><button onClick={() => setEditing(note.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Edit</button><button onClick={() => showRevisions(note.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Revision history</button></div>
          {revisions[note.id] && <div className="mt-4 rounded-lg bg-slate-50 p-4"><h4 className="text-xs font-semibold">Previous versions</h4>{revisions[note.id].length ? revisions[note.id].map(revision => <div key={revision.id} className="mt-3 border-t border-slate-200 pt-3"><time className="text-[10px] text-slate-400">{new Date(revision.editedAt).toLocaleString()}</time><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{revision.previousContent}</p></div>) : <p className="mt-2 text-xs text-slate-400">No edits have been recorded.</p>}</div>}
        </>}
      </article>) : <p className="px-5 py-12 text-center text-sm text-slate-400">No private notes recorded.</p>}
    </section>
  </div>;
}
