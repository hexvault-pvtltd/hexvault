"use client";
import { FormEvent, useEffect, useState } from "react";

type Correction = { id: string; reason: string; status: string; canReview: boolean; requestedData: { workDate?: string; checkInAt?: string; checkOutAt?: string }; employee?: { fullName: string; employeeCode: string } };
type Session = { id: string; checkInAt: string; checkOutAt: string | null };
const inputClass = "mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request could not be completed.");
  if (!body?.data) throw new Error("The server returned an invalid response.");
  return body.data;
}
export function AttendanceCorrections({ canReview, canSubmit, timeZone }: { canReview: boolean; canSubmit: boolean; timeZone: string }) {
  const [items, setItems] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReload, setSessionReload] = useState(0);
  const [workDate, setWorkDate] = useState("");
  const [sessionData, setSessionData] = useState<{ date: string; items: Session[]; error?: string } | null>(null);
  const sessionsLoading = Boolean(workDate && sessionData?.date !== workDate);
  const sessions = sessionData?.date === workDate ? sessionData.items : [];
  const dateTime = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone });
  async function refresh() {
    const data = await request("/api/v1/attendance/corrections");
    setItems(data.items);
  }
  useEffect(() => {
    let active = true;
    request("/api/v1/attendance/corrections").then(data => { if (active) setItems(data.items); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!workDate) return;
    let active = true;
    request(`/api/v1/attendance/sessions?mine=true&from=${workDate}&to=${workDate}&limit=100`).then(data => {
      if (active) setSessionData({ date: workDate, items: data.items });
    }).catch(error => { if (active) setSessionData({ date: workDate, items: [], error: error.message }); });
    return () => { active = false; };
  }, [workDate, sessionReload]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || sessionsLoading || !canSubmit) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const payload = { workDate, reason: values.reason, ...(values.sessionId ? { sessionId: values.sessionId } : {}), ...(values.checkInAt ? { checkInAt: values.checkInAt } : {}), ...(values.checkOutAt ? { checkOutAt: values.checkOutAt } : {}) };
    setBusy(true); setError(""); setMessage("");
    try {
      if (!values.checkInAt && !values.checkOutAt) throw new Error("Enter a corrected check-in or check-out time.");
      await request("/api/v1/attendance/corrections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      form.reset(); setWorkDate("");
      setMessage("Correction request submitted for approval.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to submit the correction."); }
    finally { setBusy(false); }
  }
  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await request(`/api/v1/attendance/corrections/${id}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
      setMessage(decision === "APPROVED" ? "Correction approved and attendance updated." : "Correction rejected. Attendance was not changed.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to review the correction."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    {canSubmit ? <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-xs text-slate-500">Enter all times in {timeZone}. Leave a time blank to keep its recorded value. A missing session requires a check-in time.</p>
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold">Work date<input type="date" name="workDate" required value={workDate} onChange={event => setWorkDate(event.target.value)} className={inputClass}/></label>
        <label className="text-xs font-semibold">Reason<input name="reason" required minLength={5} maxLength={1000} placeholder="Explain the missed or incorrect entry" className={inputClass}/></label>
        {workDate && <label className="text-xs font-semibold md:col-span-2">Session to correct<select key={workDate + sessions.map(item => item.id).join()} name="sessionId" disabled={sessionsLoading || !sessions.length} required={sessions.length > 1} defaultValue={sessions.length === 1 ? sessions[0].id : ""} className={inputClass}><option value="">{sessionsLoading ? "Loading your sessions..." : sessions.length ? "Select a session" : "Missing attendance for this date"}</option>{sessions.map(item => <option key={item.id} value={item.id}>{dateTime(item.checkInAt)} / {item.checkOutAt ? dateTime(item.checkOutAt) : "Open session"}</option>)}</select>{sessionData?.date === workDate && sessionData.error && <span role="alert" className="mt-2 block text-rose-600">{sessionData.error} <button type="button" onClick={() => { setSessionData(null); setSessionReload(value => value + 1); }} className="underline">Reload sessions</button></span>}</label>}
        <label className="text-xs font-semibold">Correct check-in ({timeZone})<input type="datetime-local" name="checkInAt" className={inputClass}/></label>
        <label className="text-xs font-semibold">Correct check-out ({timeZone})<input type="datetime-local" name="checkOutAt" className={inputClass}/></label>
        <div className="md:col-span-2"><button disabled={busy || sessionsLoading || Boolean(sessionData?.date === workDate && sessionData.error)} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Submit correction"}</button></div>
      </fieldset>
    </form> : <p className="rounded-xl bg-white p-4 text-sm text-slate-500">Your account needs an employee profile to submit an attendance correction.</p>}
    {error && <p role="alert" className="text-sm text-rose-600">{error} <button type="button" disabled={busy} onClick={() => { setError(""); refresh().catch(error => setError(error.message)); }} className="underline">Reload requests</button></p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Correction requests</h2></div>
      {loading ? <p role="status" className="px-5 py-8 text-sm text-slate-500">Loading correction requests...</p> : items.length ? items.map(item => <article key={item.id} className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold">{item.employee?.fullName ?? "Employee record unavailable"} <span className="font-normal text-slate-400">{item.employee?.employeeCode}</span></p><p className="mt-1 text-xs text-slate-500">{item.requestedData.workDate?.slice(0, 10) ?? "Date unavailable"} / {item.reason}</p><p className="mt-1 text-[11px] text-slate-400">{item.requestedData.checkInAt ? "In " + dateTime(item.requestedData.checkInAt) : "Check-in unchanged"} / {item.requestedData.checkOutAt ? "Out " + dateTime(item.requestedData.checkOutAt) : "Check-out unchanged"} ({timeZone})</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">{item.status}</span>{canReview && item.canReview && item.status === "PENDING" && <><button disabled={busy} onClick={() => decide(item.id, "APPROVED")} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">Approve</button><button disabled={busy} onClick={() => decide(item.id, "REJECTED")} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-50">Reject</button></>}</div></article>) : <p className="px-5 py-12 text-center text-xs text-slate-400">No correction requests loaded.</p>}
    </section>
  </div>;
}
