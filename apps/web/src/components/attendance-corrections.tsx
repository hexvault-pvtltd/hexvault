"use client";
import { FormEvent, useEffect, useState } from "react";

type Correction = { id: string; reason: string; status: string; createdAt: string; requestedData: { workDate?: string; checkInAt?: string; checkOutAt?: string }; employee: { fullName: string; employeeCode: string } };
export function AttendanceCorrections({ canReview }: { canReview: boolean }) {
  const [items, setItems] = useState<Correction[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function refresh() {
    const response = await fetch("/api/v1/attendance/corrections");
    const body = await response.json();
    if (response.ok) setItems(body.data.items);
    else setError(body.error?.message ?? "Unable to load correction requests.");
  }
  useEffect(() => {
    let active = true;
    fetch("/api/v1/attendance/corrections").then(async response => {
      const body = await response.json();
      if (!active) return;
      if (response.ok) setItems(body.data.items);
      else setError(body.error?.message ?? "Unable to load correction requests.");
    }).catch(() => { if (active) setError("Unable to load correction requests."); });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = { workDate: values.workDate, ...(values.checkInAt ? { checkInAt: new Date(String(values.checkInAt)).toISOString() } : {}), ...(values.checkOutAt ? { checkOutAt: new Date(String(values.checkOutAt)).toISOString() } : {}), reason: values.reason };
    const response = await fetch("/api/v1/attendance/corrections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message ?? "Unable to submit the request."); return; }
    event.currentTarget.reset(); setMessage("Correction request submitted for approval."); await refresh();
  }
  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    setError("");
    const response = await fetch(`/api/v1/attendance/corrections/${id}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
    const body = await response.json();
    if (!response.ok) setError(body.error?.message ?? "Unable to decide the request."); else await refresh();
  }
  return <div className="space-y-6">
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <label className="text-xs font-semibold">Work date<input type="date" name="workDate" required className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Reason<input name="reason" required minLength={5} maxLength={1000} placeholder="Explain the missed or incorrect entry" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Correct check-in<input type="datetime-local" name="checkInAt" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Correct check-out<input type="datetime-local" name="checkOutAt" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <div className="md:col-span-2"><button className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white">Submit correction</button></div>
    </form>
    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Correction requests</h2></div>
      {items.length ? items.map(item => <article key={item.id} className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold">{item.employee.fullName} <span className="font-normal text-slate-400">· {item.employee.employeeCode}</span></p><p className="mt-1 text-xs text-slate-500">{item.requestedData.workDate ? new Date(item.requestedData.workDate).toLocaleDateString() : "Date unavailable"} · {item.reason}</p><p className="mt-1 text-[11px] text-slate-400">{item.requestedData.checkInAt ? `In ${new Date(item.requestedData.checkInAt).toLocaleString()}` : "Check-in unchanged"} · {item.requestedData.checkOutAt ? `Out ${new Date(item.requestedData.checkOutAt).toLocaleString()}` : "Check-out unchanged"}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">{item.status}</span>{canReview && item.status === "PENDING" && <><button onClick={() => decide(item.id,"APPROVED")} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white">Approve</button><button onClick={() => decide(item.id,"REJECTED")} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold">Reject</button></>}</div></article>) : <p className="px-5 py-12 text-center text-xs text-slate-400">No correction requests.</p>}
    </section>
  </div>;
}
