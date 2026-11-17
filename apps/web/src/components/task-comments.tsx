"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Comment = { id: string; authorId: string; body: string; createdAt: Date | string; editedAt?: Date | string | null; author: { id: string; employee?: { fullName: string; employeeCode: string } | null } };
export function TaskComments({ taskId, initial, actorId, isOwner }: { taskId: string; initial: Comment[]; actorId: string; isOwner: boolean }) {
  const [comments, setComments] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return; setSaving(true); setError("");
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/comments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not post the comment."); return; }
      if (result?.data?.id) setComments((current) => [...current, { ...result.data, author: { id: actorId, employee: null } }]);
      form.reset(); router.refresh();
    } catch { setError("Could not reach the server. Your comment was not posted."); }
    finally { setSaving(false); }
  }
  async function remove(commentId: string) {
    if (saving) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/comments/${commentId}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not delete the comment."); return; }
      setComments(items => items.filter(item => item.id !== commentId));
    } catch { setError("Could not reach the server. The comment was not deleted."); }
    finally { setSaving(false); }
  }
  async function saveEdit(commentId: string) {
    if (saving) return; setSaving(true); setError("");
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}/comments/${commentId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: draft }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not edit the comment."); return; }
      setComments(items => items.map(item => item.id === commentId ? { ...item, body: result.data.body, editedAt: result.data.editedAt } : item)); setEditing(null);
    } catch { setError("Could not reach the server. The comment was not changed."); }
    finally { setSaving(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-sm font-semibold">Discussion</h2>
    <div className="mt-4 space-y-4">{comments.length ? comments.map(comment => <article key={comment.id} className="border-b border-slate-100 pb-3 last:border-0"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-700">{comment.authorId === actorId ? "You" : comment.author.employee?.fullName??"Former employee"}{comment.author.employee?.employeeCode&&<span className="ml-2 font-normal text-slate-400">{comment.author.employee.employeeCode}</span>}<span className="ml-2 font-normal text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>{comment.editedAt&&<span className="ml-1 font-normal text-slate-400">(edited)</span>}</p>{(comment.authorId===actorId||isOwner)&&<div className="flex gap-3"><button type="button" disabled={saving} onClick={()=>{setEditing(comment.id);setDraft(comment.body);}} className="text-[10px] text-slate-400 hover:text-indigo-600 disabled:opacity-50">Edit</button><button type="button" disabled={saving} onClick={() => remove(comment.id)} className="text-[10px] text-slate-400 hover:text-rose-600 disabled:opacity-50">Delete</button></div>}</div>{editing===comment.id?<div className="mt-2"><textarea value={draft} onChange={event=>setDraft(event.target.value)} maxLength={5000} rows={3} className="w-full rounded-lg border border-slate-200 p-3 text-sm"/><div className="mt-2 flex justify-end gap-2"><button type="button" disabled={saving} onClick={()=>setEditing(null)} className="px-2 py-1 text-xs text-slate-500">Cancel</button><button type="button" disabled={saving} onClick={()=>saveEdit(comment.id)} className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div></div>:<p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{comment.body}</p>}</article>) : <p className="text-xs text-slate-400">No comments yet.</p>}</div>
    <form onSubmit={submit} className="mt-4"><label htmlFor="comment-body" className="sr-only">Add a comment</label><textarea id="comment-body" name="body" required maxLength={5000} rows={3} className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Add context or a progress update"/><div className="mt-2 flex items-center justify-between">{error?<p role="alert" className="text-xs text-rose-600">{error}</p>:<span/>}<button disabled={saving} className="rounded-lg bg-[#f46327] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving?"Posting…":"Post comment"}</button></div></form>
  </section>;
}
