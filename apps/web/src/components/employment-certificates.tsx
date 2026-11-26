"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Certificate = { certificateId: string; title: string; recipientName: string; kind: string; jobTitle: string; statement: string; employmentStart: string; employmentEnd: string; issuedAt: string; revokedAt: string | null };
const field = "mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm";

export function EmploymentCertificates({ caseId, complete, jobTitle, endDate }: { caseId?: string; complete?: boolean; jobTitle?: string; endDate?: string }) {
  const [items, setItems] = useState<Certificate[]>([]);
  const [documents, setDocuments] = useState<{id:string;category:string;filename:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const endpoint = caseId ? `/api/v1/offboarding/${caseId}/certificates` : "/api/v1/certificates/mine";
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message ?? "Unable to load certificates.");
    setItems(body.data.items);
    setDocuments(body.data.documents ?? []);
  }, [endpoint]);
  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" }).then(async response => {
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to load certificates.");
      if (active) { setItems(body.data.items); setDocuments(body.data.documents ?? []); }
    }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);
  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!data.documentId) delete data.documentId;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to issue certificate.");
      form.reset();
      setMessage(`Certificate issued: ${body.data.certificateId}. Share this ID and the verification link with the employee.`);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to issue certificate."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    if (busy || !window.confirm("Revoke this certificate? It will no longer verify as valid. This cannot be undone.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/certificates/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "REVOKE" }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to revoke certificate.");
      setMessage("Certificate revoked. Issue a new certificate if a correction is needed."); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to revoke certificate."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby={caseId ? "case-certificates" : "my-certificates"}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id={caseId ? "case-certificates" : "my-certificates"} className="text-base font-semibold">{caseId ? "Employment certificates" : "My certificates"}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{caseId ? "Issue experience, relieving, or internship certificates after offboarding is finalized." : "Use your certificate ID and date of birth to verify a certificate, including after leaving the company."}</p></div><Link href="/verify-certificate" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Verify a certificate</Link></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="break-words rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {caseId && complete && <form onSubmit={issue} className="grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
      <label className="text-xs font-semibold">Certificate type<select name="kind" className={field}><option value="EXPERIENCE">Experience</option><option value="RELIEVING">Relieving</option><option value="INTERNSHIP">Internship completion</option><option value="OTHER">Other</option></select></label>
      <label className="text-xs font-semibold">Certificate title<input required name="title" minLength={3} maxLength={120} placeholder="Experience certificate" className={field}/></label>
      <div className="md:col-span-2"><label className="text-xs font-semibold">Original certificate document (optional)<select name="documentId" className={field}><option value="">No original file attached</option>{documents.map(document=><option key={document.id} value={document.id}>{document.filename} - {document.category}</option>)}</select></label><p className="mt-2 text-xs text-slate-500">Upload the signed original under Supporting employee documents below, then refresh this list. The selected original is shared after certificate ID and date-of-birth verification, regardless of the supporting document visibility.</p><button type="button" disabled={busy} onClick={()=>{setError("");load().catch(error=>setError(error instanceof Error?error.message:"Unable to refresh documents."));}} className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">Refresh uploaded documents</button></div>
      <label className="text-xs font-semibold">Job title<input required name="jobTitle" minLength={2} maxLength={120} defaultValue={jobTitle} className={field}/></label>
      <label className="text-xs font-semibold">Employee date of birth<input required name="dateOfBirth" type="date" min="1900-01-01" className={field}/><span className="mt-1 block font-normal text-slate-500">Confirm with the employee. Stored as a verification hash.</span></label>
      <label className="text-xs font-semibold">Employment starts<input required name="employmentStart" type="date" className={field}/></label>
      <label className="text-xs font-semibold">Employment ends<input required name="employmentEnd" type="date" defaultValue={endDate} max={endDate} className={field}/></label>
      <label className="text-xs font-semibold md:col-span-2">Certificate statement<textarea required name="statement" minLength={20} maxLength={4000} rows={4} placeholder="Confirm the employee's role, period of service, and completion of employment." className={field}/><span className="mt-1 block font-normal text-slate-500">The employee name, job title, service dates and this statement are shown when the ID and DOB match. Include only approved certificate content.</span></label>
      <div className="md:col-span-2"><button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Issue certificate"}</button></div>
    </form>}
    {caseId && !complete && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Complete the checklist, then use Finalize offboarding at the top of this page. The certificate form will appear afterward. You can upload the signed original under Supporting employee documents below now and select it when issuing.</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Loading certificates...</p> : !items.length ? <p className="py-3 text-xs text-slate-500">No certificates issued yet.</p> : <ul className="divide-y divide-slate-100">{items.map(item => <li key={item.certificateId} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><p className="text-sm font-semibold">{item.title} <span className={item.revokedAt ? "text-rose-600" : "text-emerald-700"}>{item.revokedAt ? "Revoked" : "Issued"}</span></p><p className="mt-1 break-all font-mono text-xs text-slate-600">{item.certificateId}</p><p className="mt-1 text-xs text-slate-500">{item.recipientName} / {new Date(item.issuedAt).toLocaleDateString()}</p></div><div className="flex gap-2"><Link href={`/verify-certificate?id=${encodeURIComponent(item.certificateId)}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">Verify</Link>{caseId && !item.revokedAt && <button disabled={busy} onClick={() => revoke(item.certificateId)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">Revoke</button>}</div></li>)}</ul>}
  </section>;
}
