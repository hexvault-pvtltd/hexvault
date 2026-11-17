"use client";

import { FormEvent, useState } from "react";
import { Check, ExternalLink, FilePlus2, Pencil, RotateCcw } from "lucide-react";

type Status = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
export type ManagedJob = { id: string; slug: string; title: string; department: string | null; location: string; employmentType: EmploymentType; summary: string; description: string; aboutRole: string | null; responsibilities: string[]; requirements: string[]; status: Status; expiresAt: string | null; updatedAt: string };
type FormState = Omit<ManagedJob, "id" | "slug" | "updatedAt" | "responsibilities" | "requirements"> & { responsibilities: string; requirements: string };
type FormErrors = Partial<Record<"title" | "department" | "location" | "summary" | "description" | "responsibilities" | "requirements" | "expiresAt", string>>;
const empty: FormState = { title: "", department: "", location: "Remote", employmentType: "FULL_TIME", summary: "", description: "", aboutRole: "", responsibilities: "", requirements: "", status: "DRAFT", expiresAt: null };
const statusLabel: Record<Status, string> = { DRAFT: "Draft", PUBLISHED: "Published", CLOSED: "Closed", ARCHIVED: "Archived" };
const typeLabel: Record<EmploymentType, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship" };

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message ?? "The job posting request failed.");
  return payload?.data;
}
function fieldClass() { return "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-slate-500"; }
function areaClass() { return "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-slate-500"; }

export function JobManager({ initialJobs }: { initialJobs: ManagedJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState("");

  function startEdit(job: ManagedJob) {
    setEditingId(job.id);
    setForm({ title: job.title, department: job.department ?? "", location: job.location, employmentType: job.employmentType, summary: job.summary, description: job.description, aboutRole: job.aboutRole ?? "", responsibilities: job.responsibilities.join("\n"), requirements: job.requirements.join("\n"), status: job.status, expiresAt: job.expiresAt?.slice(0, 10) ?? null });
    setMessage(""); setError(""); setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() { setEditingId(""); setForm(empty); setError(""); setFieldErrors({}); setMessage(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const responsibilities = form.responsibilities.split("\n").map(item => item.trim()).filter(Boolean);
    const requirements = form.requirements.split("\n").map(item => item.trim()).filter(Boolean);
    const nextErrors: FormErrors = {};
    if (form.title.trim().length < 3) nextErrors.title = "Enter a job title with at least 3 characters.";
    if (form.department?.trim() && form.department.trim().length > 100) nextErrors.department = "Department must be 100 characters or fewer.";
    if (form.location.trim().length < 2) nextErrors.location = "Enter a location with at least 2 characters.";
    if (form.summary.trim().length < 10) nextErrors.summary = "Summary must be at least 10 characters.";
    if (form.description.trim().length < 20) nextErrors.description = "Description must be at least 20 characters.";
    if (responsibilities.length > 30 || responsibilities.some(item => item.length < 2 || item.length > 400)) nextErrors.responsibilities = "Use 2–400 characters per line, with no more than 30 responsibilities.";
    if (requirements.length > 30 || requirements.some(item => item.length < 2 || item.length > 400)) nextErrors.requirements = "Use 2–400 characters per line, with no more than 30 requirements.";
    if (form.expiresAt && new Date(`${form.expiresAt}T00:00:00`).getTime() <= Date.now()) nextErrors.expiresAt = "Choose a closing date after today.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError("Please correct the highlighted fields before saving."); return; }

    setBusy(true); setError(""); setMessage("");
    const payload = { ...form, title: form.title.trim(), department: form.department?.trim() || null, location: form.location.trim(), summary: form.summary.trim(), description: form.description.trim(), aboutRole: form.aboutRole?.trim() || null, expiresAt: form.expiresAt || null, responsibilities, requirements };
    try {
      const data = await requestJson(editingId ? `/api/v1/jobs/${editingId}` : "/api/v1/jobs", { method: editingId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const job = { ...data.item, expiresAt: data.item.expiresAt ? new Date(data.item.expiresAt).toISOString() : null, updatedAt: new Date(data.item.updatedAt).toISOString() } as ManagedJob;
      setJobs(current => [job, ...current.filter(item => item.id !== job.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setEditingId(""); setForm(empty); setFieldErrors({}); setMessage(editingId ? "Job posting updated." : job.status === "PUBLISHED" ? "Job is live on the careers page." : "Draft job posting saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The job posting could not be saved."); }
    finally { setBusy(false); }
  }

  async function updateStatus(job: ManagedJob, status: Status) {
    if (busy || job.status === status) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await requestJson(`/api/v1/jobs/${job.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const updated = { ...job, ...data.item, expiresAt: data.item.expiresAt ? new Date(data.item.expiresAt).toISOString() : null, updatedAt: new Date(data.item.updatedAt).toISOString() } as ManagedJob;
      setJobs(current => current.map(item => item.id === updated.id ? updated : item));
      setMessage(status === "PUBLISHED" ? "Job is live on the public careers page." : `Job marked ${statusLabel[status].toLowerCase()}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The job status could not be updated."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{editingId ? "Edit job posting" : "Create a job posting"}</h2><p className="mt-1 text-[10px] text-slate-500">Drafts stay private. Published jobs appear on the public careers page.</p></div>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold"><RotateCcw size={12}/>Cancel edit</button>}</div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}{message && <p role="status" className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"><Check size={14}/>{message}</p>}
      <form onSubmit={event => void submit(event)} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-[10px] font-semibold">Job title<input required minLength={3} maxLength={120} value={form.title} onChange={event => { setForm(current => ({ ...current, title: event.target.value })); setFieldErrors(current => ({ ...current, title: undefined })); }} aria-invalid={Boolean(fieldErrors.title)} className={fieldClass()} placeholder="Full-stack Engineer"/>{fieldErrors.title && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.title}</span>}</label>
        <label className="text-[10px] font-semibold">Department<input maxLength={100} value={form.department ?? ""} onChange={event => { setForm(current => ({ ...current, department: event.target.value })); setFieldErrors(current => ({ ...current, department: undefined })); }} aria-invalid={Boolean(fieldErrors.department)} className={fieldClass()} placeholder="Engineering"/>{fieldErrors.department && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.department}</span>}</label>
        <label className="text-[10px] font-semibold">Location<input required minLength={2} maxLength={120} value={form.location} onChange={event => { setForm(current => ({ ...current, location: event.target.value })); setFieldErrors(current => ({ ...current, location: undefined })); }} aria-invalid={Boolean(fieldErrors.location)} className={fieldClass()} placeholder="Remote / City"/>{fieldErrors.location && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.location}</span>}</label>
        <label className="text-[10px] font-semibold">Employment type<select value={form.employmentType} onChange={event => setForm(current => ({ ...current, employmentType: event.target.value as EmploymentType }))} className={fieldClass()}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-[10px] font-semibold">Posting status<select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as Status }))} className={fieldClass()}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-[10px] font-semibold">Close date (optional)<input type="date" value={form.expiresAt?.slice(0, 10) ?? ""} onChange={event => { setForm(current => ({ ...current, expiresAt: event.target.value || null })); setFieldErrors(current => ({ ...current, expiresAt: undefined })); }} aria-invalid={Boolean(fieldErrors.expiresAt)} className={fieldClass()}/>{fieldErrors.expiresAt && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.expiresAt}</span>}</label>
        <label className="text-[10px] font-semibold sm:col-span-2 xl:col-span-3">Short summary<textarea required minLength={10} maxLength={280} rows={2} value={form.summary} onChange={event => { setForm(current => ({ ...current, summary: event.target.value })); setFieldErrors(current => ({ ...current, summary: undefined })); }} aria-invalid={Boolean(fieldErrors.summary)} className={areaClass()} placeholder="A concise overview shown in role listings."/>{fieldErrors.summary && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.summary}</span>}</label>
        <label className="text-[10px] font-semibold sm:col-span-2 xl:col-span-3">Job description<textarea required minLength={20} maxLength={12000} rows={5} value={form.description} onChange={event => { setForm(current => ({ ...current, description: event.target.value })); setFieldErrors(current => ({ ...current, description: undefined })); }} aria-invalid={Boolean(fieldErrors.description)} className={areaClass()} placeholder="Describe the role and the work the successful candidate will do."/>{fieldErrors.description && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.description}</span>}</label>
        <label className="text-[10px] font-semibold sm:col-span-2 xl:col-span-3">About the role (optional)<textarea maxLength={8000} rows={3} value={form.aboutRole ?? ""} onChange={event => setForm(current => ({ ...current, aboutRole: event.target.value }))} className={areaClass()} placeholder="Team, product, and working context."/></label>
        <label className="text-[10px] font-semibold sm:col-span-2 xl:col-span-3">Responsibilities <span className="font-normal text-slate-400">(one per line; 2–400 characters each, up to 30)</span><textarea rows={3} value={form.responsibilities} onChange={event => { setForm(current => ({ ...current, responsibilities: event.target.value })); setFieldErrors(current => ({ ...current, responsibilities: undefined })); }} aria-invalid={Boolean(fieldErrors.responsibilities)} className={areaClass()} placeholder={"Build and ship product features\nWork with the team to improve systems"}/>{fieldErrors.responsibilities && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.responsibilities}</span>}</label>
        <label className="text-[10px] font-semibold sm:col-span-2 xl:col-span-3">Requirements <span className="font-normal text-slate-400">(one per line; 2–400 characters each, up to 30)</span><textarea rows={3} value={form.requirements} onChange={event => { setForm(current => ({ ...current, requirements: event.target.value })); setFieldErrors(current => ({ ...current, requirements: undefined })); }} aria-invalid={Boolean(fieldErrors.requirements)} className={areaClass()} placeholder={"Relevant experience\nClear written communication"}/>{fieldErrors.requirements && <span className="mt-1 block text-[10px] font-normal text-rose-700">{fieldErrors.requirements}</span>}</label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-3"><button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#171717] px-4 text-xs font-semibold text-white disabled:opacity-50"><FilePlus2 size={14}/>{busy ? "Saving…" : editingId ? "Save changes" : "Save job posting"}</button><a href="/careers" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-semibold"><ExternalLink size={13}/>Preview careers page</a></div>
      </form>
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold">Job postings</h2><p className="mt-1 text-[10px] text-slate-500">{jobs.filter(job => job.status === "PUBLISHED").length} published · {jobs.length} total</p></div><a href="/careers" target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-slate-600 hover:text-black">Open public careers page ↗</a></div>
      {jobs.length ? <div className="divide-y divide-slate-100">{jobs.map(job => <article key={job.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><h3 className="truncate text-xs font-semibold">{job.title}</h3><p className="mt-1 truncate text-[10px] text-slate-500">{job.department ?? "Team"} · {job.location} · {typeLabel[job.employmentType]}</p><p className="mt-1 text-[9px] text-slate-400">Public link: /careers?role={job.slug}</p></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${job.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : job.status === "DRAFT" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{statusLabel[job.status]}</span><button type="button" disabled={busy} onClick={() => startEdit(job)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold disabled:opacity-50"><Pencil size={12}/>Edit</button><select aria-label={`Change status for ${job.title}`} disabled={busy} value={job.status} onChange={event => void updateStatus(job, event.target.value as Status)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] disabled:opacity-50">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></article>)}</div> : <p className="px-5 py-12 text-center text-xs text-slate-500">No job postings yet. Create a draft or publish your first role above.</p>}
    </section>
  </div>;
}
