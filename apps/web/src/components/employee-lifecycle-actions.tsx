"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function EmployeeLifecycleActions({ employeeId, status }: { employeeId: string; status: string }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function changeStatus(next: "ACTIVE" | "SUSPENDED", reason: string) {
    if (busy) return false;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/v1/employees/${employeeId}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next, reason }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not change employee status."); return false; }
      router.refresh(); return true;
    } catch { setError("Could not reach the server. Employee status was not changed."); return false; }
    finally { setBusy(false); }
  }
  async function toggle() {
    const next = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const reason = window.prompt(next === "SUSPENDED" ? "Reason for suspending this employee" : "Reason for reactivating this employee");
    if (reason === null) return;
    if (reason.trim().length < 3) { setError("Enter a reason of at least three characters."); return; }
    await changeStatus(next, reason);
  }
  async function rehire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/employees/${employeeId}/rehire`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ employmentType: form.get("employmentType"), title: form.get("title") || null, startDate: form.get("startDate"), reason: form.get("reason") }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Could not rehire this employee."); return; }
      router.refresh();
    } catch { setError("Could not reach the server. The employee was not rehired."); }
    finally { setBusy(false); }
  }
  return <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Employment lifecycle</h2>{status==="EXITED"?<form onSubmit={rehire} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Employment type<input name="employmentType" required minLength={2} maxLength={40} defaultValue="FULL_TIME" className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-xs font-medium">Role or title<input name="title" maxLength={120} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-xs font-medium">Start date<input name="startDate" type="date" required max={localDate()} defaultValue={localDate()} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"/></label><label className="text-xs font-medium">Rehire reason<input name="reason" required minLength={3} maxLength={500} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3"/></label><button disabled={busy} className="w-fit rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Rehire employee"}</button></form>:<div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{status==="SUSPENDED"?"This employee is suspended and cannot use their account.":"This employee is active."}</p><button type="button" disabled={busy} onClick={toggle} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{busy?"Saving…":status==="SUSPENDED"?"Reactivate account":"Suspend account"}</button></div>}{error&&<p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}</section>;
}
