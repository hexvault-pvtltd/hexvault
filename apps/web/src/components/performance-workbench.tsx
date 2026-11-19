"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Review = { id: string; employeeId: string; reviewerId: string; periodStart: string; periodEnd: string; summary: string; publicationStatus: string };
type Goal = { id: string; employeeId: string; title: string; description: string | null; targetDate: string | null; status: string; progressNote: string | null };
type Person = { id: string; fullName: string; employeeCode: string };

export function PerformanceWorkbench({ reviews, goals, people, ownEmployeeId, canManage, section = "all" }: { reviews: Review[]; goals: Goal[]; people: Person[]; ownEmployeeId: string | null; canManage: boolean; section?: "all" | "reviews" | "goals" }) {
  const router = useRouter();
  const [savedEmployeeId, setSavedEmployeeId] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>, endpoint: string, transform?: (data: FormData) => unknown) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setMessage("");
    const form = event.currentTarget; const data = new FormData(form);
    const payload = transform ? transform(data) : Object.fromEntries(data);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setError(body?.error?.message ?? "The request could not be completed."); return; }
      form.reset(); setSavedEmployeeId(body.data.employeeId); setMessage("Saved successfully. This record is available in the employee profile."); router.refresh();
    } catch { setError("Could not reach the server. No changes were saved."); }
    finally { setBusy(false); }
  }
  async function updateGoal(goal: Goal, status?: string) {
    if (busy) return; setBusy(true); setError(""); setMessage("");
    try {
      const progressNote = status ? undefined : window.prompt("Progress update", goal.progressNote ?? "");
      if (progressNote === null) return;
      const response = await fetch(`/api/v1/performance/goals/${goal.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(status ? { status } : { progressNote }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setError(body?.error?.message ?? "Could not update the goal."); return; }
      setSavedEmployeeId(goal.employeeId); setMessage("Goal updated and recorded in the employee profile history."); router.refresh();
    } catch { setError("Could not reach the server. The goal was not changed."); }
    finally { setBusy(false); }
  }
  async function publish(review: Review) {
    if (busy) return; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/performance/reviews/${review.id}/publish`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setError(body?.error?.message ?? "Could not publish the review."); return; }
      setSavedEmployeeId(review.employeeId); setMessage("Review published, added to profile history, and employee notified."); router.refresh();
    } catch { setError("Could not reach the server. The review was not published."); }
    finally { setBusy(false); }
  }
  const personName = (id: string) => people.find(person => person.id === id)?.fullName ?? "Employee";
  return <div className="space-y-5">
    {(error || message) && <p role={error ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-xs ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}
    {message && savedEmployeeId && <Link href={`/workforce/${savedEmployeeId}`} prefetch={false} className="inline-block text-xs font-semibold text-violet-700 hover:underline">View employee profile</Link>}
    {section !== "goals" && canManage && <form onSubmit={event => submit(event, "/api/v1/performance/reviews", data => ({ employeeId: data.get("employeeId"), periodStart: data.get("periodStart"), periodEnd: data.get("periodEnd"), summary: data.get("summary") }))} className="grid gap-3 rounded-[18px] border border-[#ececea] bg-white p-5 sm:grid-cols-2">
      <h2 className="text-sm font-semibold sm:col-span-2">Create performance review</h2>
      <label className="text-xs font-medium">Employee<select required name="employeeId" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"><option value="">Choose employee</option>{people.filter(person => person.id !== ownEmployeeId).map(person => <option key={person.id} value={person.id}>{person.fullName} · {person.employeeCode}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Period starts<input required type="date" name="periodStart" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-2"/></label><label className="text-xs font-medium">Period ends<input required type="date" name="periodEnd" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-2"/></label></div>
      <label className="text-xs font-medium sm:col-span-2">Summary<textarea required minLength={10} maxLength={10000} name="summary" rows={4} className="mt-1 block w-full rounded-lg border border-slate-200 p-3"/></label>
      <button disabled={busy || !people.some(person => person.id !== ownEmployeeId)} className="min-h-10 w-fit rounded-full bg-[#272725] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save draft"}</button>
    </form>}
    {section !== "reviews" && (ownEmployeeId || canManage) && <form onSubmit={event => submit(event, "/api/v1/performance/goals", data => ({ ...(canManage && data.get("employeeId") ? { employeeId: data.get("employeeId") } : {}), title: data.get("title"), description: data.get("description") || null, targetDate: data.get("targetDate") || null }))} className="grid gap-3 rounded-[18px] border border-[#ececea] bg-white p-5 sm:grid-cols-2">
      <h2 className="text-sm font-semibold sm:col-span-2">Add a goal</h2>
      {canManage && <label className="text-xs font-medium">Employee<select required={!ownEmployeeId} name="employeeId" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"><option value="">{ownEmployeeId ? "My goals" : "Choose employee"}</option>{people.map(person => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label>}
      <label className="text-xs font-medium">Goal title<input required minLength={2} maxLength={160} name="title" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"/></label>
      <label className="text-xs font-medium">Target date<input type="date" name="targetDate" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"/></label>
      <label className="text-xs font-medium sm:col-span-2">Description<textarea maxLength={4000} name="description" rows={2} className="mt-1 block w-full rounded-lg border border-slate-200 p-3"/></label>
      <button disabled={busy} className="min-h-10 w-fit rounded-full bg-[#f46327] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Create goal"}</button>
    </form>}
    {section !== "goals" && <section className="rounded-[18px] border border-[#ececea] bg-white p-5"><h2 className="text-sm font-semibold">Reviews</h2>{reviews.length ? <div className="mt-3 divide-y divide-slate-100">{reviews.map(review => <article key={review.id} id={`review-${review.id}`} className="scroll-mt-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/workforce/${review.employeeId}`} className="text-xs font-semibold hover:underline">{personName(review.employeeId)}</Link><p className="mt-1 text-[10px] text-slate-400">{new Date(review.periodStart).toLocaleDateString()} – {new Date(review.periodEnd).toLocaleDateString()} · {review.publicationStatus}</p></div>{canManage && review.publicationStatus === "DRAFT" && <button disabled={busy} onClick={() => publish(review)} className="rounded-full border border-slate-200 px-3 py-2 text-[10px] font-semibold disabled:opacity-50">Publish review</button>}</div><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{review.summary}</p></article>)}</div> : <p className="mt-4 text-xs text-slate-500">No reviews are available in your scope.</p>}</section>}
    {section !== "reviews" && <section className="rounded-[18px] border border-[#ececea] bg-white p-5"><h2 className="text-sm font-semibold">Goals</h2>{goals.length ? <div className="mt-3 divide-y divide-slate-100">{goals.map(goal => <article key={goal.id} id={`goal-${goal.id}`} className="scroll-mt-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">{goal.title} <span className="ml-1 font-normal text-slate-400">· <Link href={`/workforce/${goal.employeeId}`} className="hover:underline">{personName(goal.employeeId)}</Link></span></p><p className="mt-1 text-[10px] text-slate-400">{goal.status}{goal.targetDate ? ` · Target ${new Date(goal.targetDate).toLocaleDateString()}` : ""}</p></div>{goal.status === "ACTIVE" && (canManage || goal.employeeId === ownEmployeeId) && <div className="flex gap-2"><button disabled={busy} onClick={() => updateGoal(goal)} className="rounded-full border border-slate-200 px-3 py-2 text-[10px]">Update progress</button><button disabled={busy} onClick={() => updateGoal(goal, "COMPLETED")} className="rounded-full bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800">Complete</button></div>}</div>{goal.description && <p className="mt-2 text-xs text-slate-600">{goal.description}</p>}{goal.progressNote && <p className="mt-2 text-xs text-slate-500">Progress: {goal.progressNote}</p>}</article>)}</div> : <p className="mt-4 text-xs text-slate-500">No goals are available in your scope.</p>}</section>}
  </div>;
}
