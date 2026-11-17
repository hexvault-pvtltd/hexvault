"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChecklistCompleteButton({ apiPath }: { apiPath: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function complete() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(apiPath, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setMessage(body?.error?.message ?? "Unable to complete this item."); return; }
      router.refresh();
    } catch { setMessage("Could not reach the server. This item was not changed."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={complete} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">{busy ? "Saving…" : "Mark complete"}</button>{message && <p role="alert" className="mt-1 max-w-40 text-[10px] text-rose-600">{message}</p>}</div>;
}

export function FinalizeOffboardingButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function finalize() {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/offboarding/${caseId}/finalize`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setMessage(body?.error?.message ?? "Unable to finalize offboarding."); return; }
      router.refresh();
    } catch { setMessage("Could not reach the server. Offboarding was not finalized."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={finalize} className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{busy ? "Finalizing…" : "Finalize offboarding"}</button>{message && <p role="alert" className="mt-2 text-[10px] text-rose-600">{message}</p>}</div>;
}

export function LifecycleCreateForm({ kind, employees }: { kind: "onboarding" | "offboarding"; employees: Array<{ id: string; fullName: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const payload = kind === "onboarding" ? { employeeId: data.employeeId } : { employeeId: data.employeeId, effectiveDate: data.effectiveDate, reason: data.reason };
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { setMessage(body?.error?.message ?? "Could not create case."); return; }
      if (typeof body?.data?.id !== "string") { setMessage("The case was created, but its detail page could not be opened. Refresh the list to continue."); return; }
      router.push(`/hr/${kind}/${body.data.id}`);
    } catch { setMessage("Could not reach the server. The case was not created."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><select required name="employeeId" className="h-10 rounded-lg border border-slate-200 px-3 text-xs"><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select>{kind === "offboarding" && <><input required type="date" name="effectiveDate" aria-label="Effective date" className="h-10 rounded-lg border border-slate-200 px-3 text-xs"/><input required name="reason" placeholder="Reason for exit" className="h-10 rounded-lg border border-slate-200 px-3 text-xs"/></>}<button disabled={busy} className="rounded-lg bg-[#f46327] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : `Start ${kind}`}</button>{message && <p role="alert" className="text-xs text-rose-600 sm:col-span-full">{message}</p>}</form>;
}
