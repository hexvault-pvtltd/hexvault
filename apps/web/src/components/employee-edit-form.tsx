"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLoadingRouter as useRouter } from "@/components/app-loading";
import { DepartmentTeamFields } from "@/components/department-team-fields";

type Employee = { id: string; employeeCode: string; fullName: string; workEmail: string; title: string | null; phone: string | null; department: { id: string; name: string } | null; memberships: { team: { id: string } }[] };


export function EmployeeEditForm({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [organizationReady, setOrganizationReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/employees/${employeeId}`, { cache: "no-store" }).then(async response => {
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to load employee record.");
      if (active) setEmployee(body.data);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load employee record."); });
    return () => { active = false; };
  }, [employeeId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !organizationReady) return;
    setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    const values = Object.fromEntries(fields);
    try {
      const response = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeCode: values.employeeCode, fullName: values.fullName, workEmail: values.workEmail, title: values.title || null, phone: values.phone || null, departmentId: values.departmentId || null, teamIds: fields.getAll("teamIds") }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to save employee changes.");
      router.push(`/workforce/${employeeId}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save employee changes."); }
    finally { setBusy(false); }
  }

  if (!employee) return <div className="max-w-2xl">{error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : <p className="text-sm text-slate-400">Loading employee record…</p>}</div>;
  return <div className="max-w-2xl"><p className="text-xs text-slate-400">People / Workforce / {employee.employeeCode}</p><h1 className="mt-2 text-2xl font-semibold">Edit employee</h1><p className="mt-1 text-sm text-slate-500">Profile changes are recorded in employment history and the audit log.</p>
    <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <label className="block text-xs font-semibold">Employee number<input required name="employeeCode" maxLength={32} defaultValue={employee.employeeCode} placeholder="0001" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/><span className="mt-1 block font-normal text-slate-500">Use numbers such as 0001 or 0002. Each employee number must be unique.</span></label>
      <label className="block text-xs font-semibold">Full name<input required name="fullName" minLength={2} maxLength={120} defaultValue={employee.fullName} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      <label className="block text-xs font-semibold">Work email<input required type="email" name="workEmail" defaultValue={employee.workEmail} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold">Job title<input name="title" maxLength={120} defaultValue={employee.title ?? ""} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="block text-xs font-semibold">WhatsApp number<input type="tel" name="phone" maxLength={40} placeholder="+91 98765 43210" defaultValue={employee.phone ?? ""} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      </div>
      <DepartmentTeamFields initialDepartmentId={employee.department?.id ?? ""} initialTeamIds={employee.memberships.map(item => item.team.id)} disabled={busy} onReadyChange={setOrganizationReady}/>
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2"><button disabled={busy || !organizationReady} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button><button type="button" onClick={() => router.push(`/workforce/${employeeId}`)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Cancel</button></div>
    </form>
  </div>;
}
