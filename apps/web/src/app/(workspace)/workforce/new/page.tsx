"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEmployee() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/employees", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error?.message ?? "Unable to save employee.");
        return;
      }
      if (typeof body?.data?.id !== "string") {
        setError("The employee was saved, but the response did not include its profile link. Refresh the directory to find the employee.");
        return;
      }
      router.push(`/workforce/${body.data.id}`);
    } catch {
      setError("Could not reach the server. The employee record was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="max-w-2xl"><p className="text-xs text-slate-400">People / Workforce / New</p><h1 className="mt-2 text-2xl font-semibold">Add employee record</h1><p className="mt-1 text-sm text-slate-500">After saving, open the employee profile to create an invitation link for manual WhatsApp sharing.</p><form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"><label className="block text-xs font-semibold">Full name<input required name="fullName" minLength={2} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Employee code<input required name="employeeCode" minLength={2} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="block text-xs font-semibold">Work email<input required type="email" name="workEmail" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label></div><label className="block text-xs font-semibold">Job title<input name="title" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>{error && <p role="alert" className="text-xs text-rose-600">{error}</p>}<button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save employee"}</button></form></div>;
}
