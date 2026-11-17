"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Check, Copy, Globe2, Link2, LoaderCircle, MapPin, Share2 } from "lucide-react";

type PublicJob = { id: string; slug: string; title: string; department: string | null; location: string; employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP"; summary: string; description: string; aboutRole: string | null; responsibilities: string[]; requirements: string[]; publishedAt: string | null; expiresAt: string | null };
const typeLabel: Record<PublicJob["employmentType"], string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", INTERNSHIP: "Internship" };

export function CareersBoard({ initialRole }: { initialRole: string }) {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialRole);
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/v1/public/jobs", { cache: "no-store" }).then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Job openings could not be loaded.");
      return payload.data.items as PublicJob[];
    }).then(items => { if (active) { setJobs(items); setError(""); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Job openings could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const locations = useMemo(() => ["All locations", ...Array.from(new Set(jobs.map(job => job.location))).sort()], [jobs]);
  const filtered = useMemo(() => jobs.filter(job => (locationFilter === "All locations" || job.location === locationFilter) && (typeFilter === "All types" || typeLabel[job.employmentType] === typeFilter)), [jobs, locationFilter, typeFilter]);
  const selected = filtered.find(job => job.slug === selectedSlug) ?? filtered[0] ?? null;

  function selectJob(job: PublicJob) {
    setSelectedSlug(job.slug);
    window.history.replaceState(null, "", `/careers?role=${encodeURIComponent(job.slug)}`);
  }
  async function copyLink() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/careers?role=${encodeURIComponent(selected.slug)}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError("Could not copy the link. Copy it from the address bar instead."); }
  }
  async function shareJob() {
    if (!selected) return;
    const url = `${window.location.origin}/careers?role=${encodeURIComponent(selected.slug)}`;
    if (navigator.share) {
      setSharing(true);
      try { await navigator.share({ title: `${selected.title} · HEXVAULT`, text: selected.summary, url }); }
      catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError("This job could not be shared."); }
      finally { setSharing(false); }
    } else { await copyLink(); }
  }

  return <main className="min-h-dvh bg-[#050505] p-3 text-white sm:p-5 lg:p-8">
    <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[24px] border border-white/20 bg-[#090909] shadow-[0_0_80px_rgba(240,91,36,.06)] sm:min-h-[calc(100dvh-80px)] sm:rounded-[32px]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-white/10 px-5 sm:px-8 lg:px-12">
        <Link href="/careers" aria-label="HEXVAULT Careers home" className="inline-flex shrink-0 items-center gap-2.5"><Image src="/brand/hexvault-logo.png" alt="" width={64} height={64} priority className="size-14 object-contain sm:size-16"/><span className="text-xs font-semibold tracking-[.16em] text-white">HEXVAULT</span></Link>
        <nav className="flex items-center gap-3 text-[10px] text-white/65 sm:gap-7 sm:text-xs"><a href="#open-roles" className="hidden transition-colors hover:text-[#f5682d] sm:inline">Open roles</a><span className="text-[#f5682d]">Careers</span><Link href="/login" className="rounded-full border border-white/15 px-3 py-2 text-white/80 transition-colors hover:border-white/40 hover:text-white">Team login</Link></nav>
      </header>
      <div className="grid flex-1 lg:grid-cols-[.92fr_1.08fr]">
        <section id="open-roles" className="border-b border-white/10 px-5 py-7 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10 xl:px-12">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f5682d]">Careers at HEXVAULT</p><h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Build what matters.</h1><p className="mt-3 max-w-lg text-xs leading-6 text-white/60 sm:text-sm">Explore opportunities to build reliable systems and solve real-world problems with our team.</p>
          <div className="mt-8 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em]"><span className="text-white/50">{String(jobs.length).padStart(2, "0")}</span><span className="text-[#f5682d]">Open roles</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-[10px] text-white/50">Location<select value={locationFilter} onChange={event => setLocationFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 text-xs text-white outline-none focus:border-[#f5682d]">{locations.map(location => <option key={location}>{location}</option>)}</select></label><label className="text-[10px] text-white/50">Type<select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 text-xs text-white outline-none focus:border-[#f5682d]"><option>All types</option>{Object.values(typeLabel).map(label => <option key={label}>{label}</option>)}</select></label></div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</p>}
          <div className="mt-5 divide-y divide-white/10">
            {loading ? <p className="flex items-center gap-2 py-10 text-xs text-white/55"><LoaderCircle size={14} className="animate-spin"/>Loading current openings…</p> : filtered.length ? filtered.map(job => <button key={job.id} type="button" onClick={() => selectJob(job)} aria-pressed={selected?.id === job.id} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-l-2 px-3 py-4 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-4 ${selected?.id === job.id ? "border-[#f5682d] bg-[#f5682d]/10" : "border-transparent hover:bg-white/[.04]"}`}><span className="truncate text-xs font-medium sm:text-sm">{job.title}</span><span className="hidden text-[9px] uppercase tracking-wide text-white/45 sm:block">{job.department ?? "Team"}</span><span className="text-[10px] text-white/60">{job.location}</span><span className="col-start-2 row-start-2 text-right text-[10px] text-white/60 sm:col-start-3">{typeLabel[job.employmentType]}</span></button>) : <div className="py-12 text-center"><p className="text-sm font-medium">{jobs.length ? "No roles match those filters." : "No open roles right now."}</p><p className="mt-2 text-xs text-white/45">{jobs.length ? "Try another location or employment type." : "Please check back soon for new opportunities."}</p></div>}
          </div>
        </section>
        <section className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
          {selected ? <article className="mx-auto max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#f5682d]">Job opening</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void copyLink()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-[10px] font-medium transition-colors hover:border-white/35">{copied ? <Check size={13} className="text-emerald-400"/> : <Copy size={13} className="text-[#f5682d]"/>}{copied ? "Copied link" : "Copy link"}</button><button type="button" onClick={() => void shareJob()} disabled={sharing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-[10px] font-medium transition-colors hover:border-white/35 disabled:opacity-50"><Share2 size={13} className="text-[#f5682d]"/>{sharing ? "Sharing…" : "Share"}</button></div>
            <h2 className="mt-7 break-words text-4xl font-semibold uppercase leading-[1.08] tracking-[.03em] sm:text-5xl xl:text-6xl">{selected.title}</h2>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/65"><span className="inline-flex items-center gap-2"><MapPin size={14} className="text-[#f5682d]"/>{selected.location}</span><span className="text-[#f5682d]">·</span><span className="inline-flex items-center gap-2"><BriefcaseBusiness size={14} className="text-[#f5682d]"/>{typeLabel[selected.employmentType]}</span>{selected.department && <><span className="text-[#f5682d]">·</span><span>{selected.department}</span></>}</div>
            <div className="my-6 border-t border-white/15"/><p className="text-sm leading-6 text-white/80">{selected.summary}</p>
            {selected.aboutRole && <section className="mt-7"><h3 className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f5682d]">About the role</h3><p className="mt-2 whitespace-pre-line text-xs leading-6 text-white/65">{selected.aboutRole}</p></section>}
            <section className="mt-7"><h3 className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f5682d]">Role description</h3><p className="mt-2 whitespace-pre-line text-xs leading-6 text-white/65">{selected.description}</p></section>
            {selected.responsibilities.length > 0 && <section className="mt-7"><h3 className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f5682d]">What you’ll do</h3><ul className="mt-2 space-y-1.5">{selected.responsibilities.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-xs leading-5 text-white/65"><span className="text-[#f5682d]">—</span><span>{item}</span></li>)}</ul></section>}
            {selected.requirements.length > 0 && <section className="mt-7"><h3 className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#f5682d]">What you bring</h3><ul className="mt-2 space-y-1.5">{selected.requirements.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-xs leading-5 text-white/65"><span className="text-[#f5682d]">—</span><span>{item}</span></li>)}</ul></section>}
            {selected.expiresAt && <p className="mt-7 text-[10px] text-white/45">Applications close {new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(selected.expiresAt))}.</p>}
          </article> : !loading && <div className="grid min-h-64 place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-[#f5682d]"><Globe2 size={20}/></span><h2 className="mt-4 text-sm font-semibold">Explore careers at HEXVAULT</h2><p className="mt-2 max-w-sm text-xs leading-5 text-white/50">Select an open role to learn more and share it with your network.</p></div></div>}
        </section>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-[9px] text-white/45 sm:px-8 lg:px-12"><span>© {new Date().getFullYear()} HEXVAULT</span><span className="inline-flex items-center gap-2 text-[#f5682d]"><Link2 size={12}/>Careers</span><Link href="/login" className="inline-flex items-center gap-1 text-white/55 hover:text-white">Team login <ArrowUpRight size={11}/></Link></footer>
    </div>
  </main>;
}
