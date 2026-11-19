"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Shift = { id: string; name: string; startLocalTime: string; endLocalTime: string; timezone: string; graceMinutes: number; active: boolean };
type Employee = { id: string; employeeCode: string; fullName: string; lifecycleStatus?: string };
type Assignment = { id: string; validFrom: string; validTo: string | null; shift: Shift; employee: Employee };

export function ShiftDefinitions({ timeZone }: { timeZone: string }) {
  const [items, setItems] = useState<Shift[]>([]); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [deactivating, setDeactivating] = useState<string | null>(null);
  async function refresh() { const res = await fetch("/api/v1/shifts"); const body = await res.json().catch(() => null); if (!res.ok) throw new Error(body?.error?.message ?? "Unable to load shifts."); setItems(body?.data?.items ?? []); }
  useEffect(() => { let active = true; fetch("/api/v1/shifts").then(async res => { const body = await res.json().catch(() => null); if (!active) return; if (res.ok) setItems(body?.data?.items ?? []); else setError(body?.error?.message ?? "Unable to load shifts."); }).catch(() => { if (active) setError("Unable to load shifts."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (busy) return; const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); setBusy(true); setError(""); setMessage(""); try { const res = await fetch("/api/v1/shifts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, graceMinutes: Number(values.graceMinutes) }) }); const body = await res.json().catch(() => null); if (!res.ok) throw new Error(body?.error?.message ?? "Unable to create shift."); form.reset(); setMessage("Shift created."); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create shift."); } finally { setBusy(false); } }
  async function deactivate(id: string) { if (deactivating) return; setDeactivating(id); setError(""); setMessage(""); try { const res = await fetch(`/api/v1/shifts/${id}`, { method: "DELETE" }); const body = await res.json().catch(() => null); if (!res.ok) throw new Error(body?.error?.message ?? "Unable to deactivate shift."); setMessage("Shift deactivated."); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to deactivate shift."); } finally { setDeactivating(null); } }
  return <div className="space-y-6">{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <form onSubmit={create} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-3">
      <label className="text-xs font-semibold">Shift name<input name="name" required minLength={2} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Start time<input name="startLocalTime" type="time" required className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">End time<input name="endLocalTime" type="time" required className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Timezone<input name="timezone" defaultValue={timeZone} required className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <label className="text-xs font-semibold">Grace period (minutes)<input name="graceMinutes" type="number" min="0" max="180" defaultValue="0" required className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
      <div className="flex items-end"><button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Create shift"}</button></div>
    </form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Shift definitions</h2></div>{loading ? <p className="px-5 py-12 text-center text-xs text-slate-400">Loading shifts…</p> : items.length ? items.map(item => <article key={item.id} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-0"><div><p className="text-xs font-semibold">{item.name} <span className={`ml-2 rounded-full px-2 py-1 text-[10px] ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.active ? "Active" : "Inactive"}</span></p><p className="mt-1 text-[11px] text-slate-500">{item.startLocalTime}–{item.endLocalTime} · {item.timezone} · {item.graceMinutes} minute grace</p></div>{item.active && <button disabled={Boolean(deactivating)} onClick={() => deactivate(item.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-50">{deactivating === item.id ? "Deactivating…" : "Deactivate"}</button>}</article>) : <p className="px-5 py-12 text-center text-xs text-slate-400">No shifts configured.</p>}</section>
  </div>;
}


async function assignmentRecords(signal?: AbortSignal) {
    const paths = ["/api/v1/shift-assignments", "/api/v1/employees", "/api/v1/shifts"];
    return Promise.allSettled(paths.map(async path => {
      const response = await fetch(path, { signal, cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(body?.data?.items)) throw new Error(body?.error?.message ?? "Unable to load records.");
      return body.data.items;
    }));
}

export function ShiftAssignmentManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const apply = useCallback((results: Awaited<ReturnType<typeof assignmentRecords>>) => {
    const names = ["Assignments", "Employees", "Shifts"];
    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") { failures.push(names[index] + ": " + (result.reason instanceof Error ? result.reason.message : "Load failed.")); return; }
      if (index === 0) setAssignments(result.value);
      if (index === 1) setEmployees(result.value.filter((employee: Employee) => employee.lifecycleStatus !== "EXITED"));
      if (index === 2) setShifts(result.value.filter((shift: Shift) => shift.active));
    });
    setError(failures.join(" ")); setReady(!failures.length); setLoading(false);
  }, []);
  const load = useCallback(async () => { setLoading(true); setReady(false); setError(""); apply(await assignmentRecords()); }, [apply]);
  useEffect(() => { const controller = new AbortController(); assignmentRecords(controller.signal).then(results => { if (!controller.signal.aborted) apply(results); }); return () => controller.abort(); }, [apply]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !ready) return;
    const form = event.currentTarget; const values = Object.fromEntries(new FormData(form));
    const payload = { employeeId: values.employeeId, shiftId: values.shiftId, validFrom: values.validFrom, ...(values.validTo ? { validTo: values.validTo } : {}) };
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/shift-assignments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to assign shift.");
      form.reset(); setMessage("Shift assigned."); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to assign shift."); }
    finally { setBusy(false); }
  }
  async function end(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); if (busy) return;
    const validTo = new FormData(event.currentTarget).get("validTo");
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/shift-assignments/" + id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ validTo }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to update assignment.");
      setMessage("Assignment end date saved."); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update assignment."); }
    finally { setBusy(false); }
  }
  const field = "mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm";
  return <div className="space-y-6">
    {error && <p role="alert" className="text-sm text-rose-600">{error} <button disabled={busy || loading} type="button" onClick={() => { setLoading(true); setReady(false); void load(); }} className="underline">Reload data</button></p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-5"><fieldset disabled={busy || loading || !ready} className="grid gap-4 md:grid-cols-4">
      <label className="text-xs font-semibold">Employee<select required name="employeeId" className={field}><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.fullName} / {employee.employeeCode}</option>)}</select></label>
      <label className="text-xs font-semibold">Shift<select required name="shiftId" className={field}><option value="">Select shift</option>{shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name} / {shift.startLocalTime} - {shift.endLocalTime}</option>)}</select></label>
      <label className="text-xs font-semibold">Valid from<input required type="date" name="validFrom" className={field}/></label>
      <label className="text-xs font-semibold">Valid to (optional)<input type="date" name="validTo" className={field}/></label>
      <div className="md:col-span-4"><button disabled={busy || loading || !ready || !employees.length || !shifts.length} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Assign shift"}</button></div>
    </fieldset>{ready && !shifts.length && <p className="mt-3 text-xs text-slate-500">Create an active shift on the Shifts page before assigning it.</p>}{ready && !employees.length && <p className="mt-3 text-xs text-slate-500">No eligible employees are available in your scope.</p>}</form>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Employee assignments</h2></div>
      {loading ? <p role="status" className="px-5 py-12 text-center text-xs text-slate-400">Loading assignments...</p> : assignments.length ? assignments.map(item => <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><div><p className="text-xs font-semibold">{item.employee.fullName} / {item.employee.employeeCode}</p><p className="mt-1 text-[11px] text-slate-500">{item.shift.name} / {item.validFrom.slice(0, 10)} to {item.validTo?.slice(0, 10) ?? "Ongoing"}</p><p className="mt-1 text-[11px] text-slate-500">{item.shift.startLocalTime} - {item.shift.endLocalTime} / {item.shift.timezone}</p></div>
        <form onSubmit={event => end(event, item.id)} className="flex flex-wrap items-end gap-2"><label className="text-[11px] font-semibold">Assignment ends<input type="date" required name="validTo" min={item.validFrom.slice(0, 10)} defaultValue={item.validTo?.slice(0, 10) ?? ""} className={field}/></label><button disabled={busy || loading} className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50">Save end date</button></form>
      </article>) : <p className="px-5 py-12 text-center text-xs text-slate-400">{ready ? "No shift assignments." : "Assignment records could not be loaded."}</p>}
    </section>
  </div>;
}
