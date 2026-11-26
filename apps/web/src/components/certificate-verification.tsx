"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Result = { status: "VERIFIED" | "REVOKED"; certificateId: string; title?: string; recipientName?: string; jobTitle?: string; statement?: string; employmentStart?: string; employmentEnd?: string; issuedAt?: string; original?: { filename: string; url: string; expiresInSeconds: number } | null };
const date = (value?: string) => value ? new Date(value).toLocaleDateString("en-IN", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }) : "";

export function CertificateVerification({ initialCertificateId = "" }: { initialCertificateId?: string }) {
  const [certificateId, setCertificateId] = useState(initialCertificateId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const input = { certificateId, dateOfBirth: new FormData(form).get("dateOfBirth") };
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/v1/public/certificates/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Verification is unavailable. Try again later.");
      setResult(body.data);
      (form.elements.namedItem("dateOfBirth") as HTMLInputElement).value = "";
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to verify certificate."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:py-16 print:bg-white print:py-0">
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="flex justify-between text-sm print:hidden"><Link href="/" className="font-bold">HEXVAULT</Link><Link href="/dashboard" className="text-slate-600">Dashboard / Sign in</Link></nav>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:hidden">
        <h1 className="text-2xl font-semibold">Verify your certificate</h1><p className="mt-2 text-sm leading-6 text-slate-500">Enter the certificate ID supplied by HEXVAULT and your date of birth. You can verify without signing in, including after your employment ends.</p>
        <form onSubmit={verify} onChange={() => { setResult(null); setError(""); }} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Certificate ID<input required autoComplete="off" name="certificateId" maxLength={80} value={certificateId} onChange={event => setCertificateId(event.target.value.toUpperCase())} placeholder="HV-INTERN-2026-0005" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-mono text-sm"/></label>
          <label className="block text-sm font-medium">Date of birth<input required autoComplete="off" name="dateOfBirth" type="date" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"/></label>
          <button disabled={busy} className="w-full rounded-lg bg-[#f46327] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Verifying..." : "Verify certificate"}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </section>
      {result && <section role="status" className="break-words rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 print:border-2">
        <p className={result.status === "VERIFIED" ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-rose-700"}>{result.status === "VERIFIED" ? "Verified certificate" : "Certificate revoked"}</p>
        <p className="mt-2 break-all font-mono text-xs text-slate-500">{result.certificateId}</p>
        {result.status === "REVOKED" ? <p className="mt-4 text-sm">This certificate has been revoked by the issuer and is no longer valid. Contact HEXVAULT HR for assistance.</p> : <>
          <p className="mt-6 text-xs font-bold tracking-widest">HEXVAULT</p><h2 className="mt-2 text-2xl font-semibold">{result.title}</h2>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Issued to</dt><dd className="mt-1 font-semibold">{result.recipientName}</dd></div><div><dt className="text-slate-500">Role</dt><dd className="mt-1">{result.jobTitle}</dd></div><div><dt className="text-slate-500">Period of service</dt><dd className="mt-1">{date(result.employmentStart)} to {date(result.employmentEnd)}</dd></div><div><dt className="text-slate-500">Issued on</dt><dd className="mt-1">{date(result.issuedAt)}</dd></div></dl>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-7">{result.statement}</p><p className="mt-6 text-xs text-slate-500">Verified against the HEXVAULT certificate registry on {new Date().toLocaleDateString()}. Verify again online to check the current status.</p>
          {result.original&&<p className="mt-5 print:hidden"><a href={result.original.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-[#f46327] px-4 py-2 text-sm font-semibold text-white">Download original certificate</a><span className="mt-2 block text-xs text-slate-500">{result.original.filename}. Link expires in five minutes; verify again for a new link.</span></p>}
          <button onClick={() => window.print()} className="mt-5 rounded-lg border border-slate-200 px-4 py-2 text-sm print:hidden">Print / Save PDF</button>
        </>}
      </section>}
    </div>
  </main>;
}
