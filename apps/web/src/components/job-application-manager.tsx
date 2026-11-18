"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, ExternalLink, Mail, MapPin, Phone } from "lucide-react";

type ApplicationStatus = "NEW" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
export type ManagedApplication = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  portfolioUrl: string | null;
  linkedInUrl: string | null;
  coverLetter: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  jobPosting: { id: string; title: string; slug: string; status: string };
};

const labels: Record<ApplicationStatus, string> = { NEW: "New", REVIEWING: "Reviewing", SHORTLISTED: "Shortlisted", REJECTED: "Rejected", HIRED: "Hired" };
const statusClass: Record<ApplicationStatus, string> = {
  NEW: "bg-sky-50 text-sky-700",
  REVIEWING: "bg-amber-50 text-amber-700",
  SHORTLISTED: "bg-violet-50 text-violet-700",
  REJECTED: "bg-rose-50 text-rose-700",
  HIRED: "bg-emerald-50 text-emerald-700",
};

export function JobApplicationManager({ initialApplications }: { initialApplications: ManagedApplication[] }) {
  const [items, setItems] = useState(initialApplications);
  const [filter, setFilter] = useState<"ALL" | ApplicationStatus>("ALL");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const filtered = useMemo(() => filter === "ALL" ? items : items.filter(item => item.status === filter), [filter, items]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    if (busyId) return;
    setBusyId(id); setError("");
    try {
      const response = await fetch(`/api/v1/job-applications/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The application status could not be updated.");
      setItems(current => current.map(item => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The application status could not be updated."); }
    finally { setBusyId(""); }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div><h2 className="text-sm font-semibold">Job applications</h2><p className="mt-1 text-[10px] text-slate-500">{items.filter(item => item.status === "NEW").length} new · {items.length} total</p></div>
      <label className="text-[10px] font-semibold text-slate-600">Status<select value={filter} onChange={event => setFilter(event.target.value as "ALL" | ApplicationStatus)} className="ml-2 h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px]"><option value="ALL">All applications</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {filtered.length ? <div className="divide-y divide-slate-100">{filtered.map(application => <article key={application.id} className="grid gap-4 p-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.65fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{application.fullName}</h3><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusClass[application.status]}`}>{labels[application.status]}</span></div>
        <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600"><BriefcaseBusiness size={11}/>{application.jobPosting.title}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-500"><a href={`mailto:${application.email}`} className="inline-flex items-center gap-1.5 hover:text-black"><Mail size={11}/>{application.email}</a>{application.phone && <a href={`tel:${application.phone}`} className="inline-flex items-center gap-1.5 hover:text-black"><Phone size={11}/>{application.phone}</a>}{application.location && <span className="inline-flex items-center gap-1.5"><MapPin size={11}/>{application.location}</span>}</div>
        <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600">{application.coverLetter}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-600">{application.portfolioUrl && <a href={application.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-black">Portfolio <ExternalLink size={10}/></a>}{application.linkedInUrl && <a href={application.linkedInUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-black">LinkedIn <ExternalLink size={10}/></a>}</div>
      </div>
      <div className="flex flex-col items-start justify-between gap-3 lg:items-end"><p className="text-[9px] text-slate-400">Received {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.createdAt))}</p><label className="text-[10px] font-semibold">Application status<select disabled={busyId === application.id} value={application.status} onChange={event => void updateStatus(application.id, event.target.value as ApplicationStatus)} className="ml-2 h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px] disabled:opacity-50">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    </article>)}</div> : <p className="px-5 py-12 text-center text-xs text-slate-500">No applications match this status.</p>}
  </section>;
}
