"use client";

import { FormEvent, useState } from "react";

export function WorkJournalForm({ tasks }: { tasks: Array<{ id: string; title: string }> }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const taskId = String(fields.get("taskId") ?? "");
    const progressNote = String(fields.get("progressNote") ?? "");
    const rawMinutes = String(fields.get("minutesSpent") ?? "");
    const body = {
      workDate: fields.get("workDate"),
      summary: fields.get("summary"),
      blockers: fields.get("blockers") || undefined,
      nextPlan: fields.get("nextPlan") || undefined,
      entries: taskId && progressNote ? [{ taskId, progressNote, ...(rawMinutes ? { minutesSpent: Number(rawMinutes) } : {}) }] : [],
    };

    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/v1/work-logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setIsError(true);
        setMessage(result?.error?.message ?? "Could not save your journal.");
        return;
      }
      setMessage("Your journal was saved.");
      form.reset();
      location.reload();
    } catch {
      setIsError(true);
      setMessage("Could not reach the server. Your journal was not saved.");
    } finally {
      setBusy(false);
    }
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Work date<input required name="workDate" type="date" defaultValue={today} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"/></label><label className="block text-xs font-semibold">Task progress entry<select name="taskId" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"><option value="">No task linked</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label></div>
    <label className="block text-xs font-semibold">What did you work on?<textarea required name="summary" rows={3} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
    <label className="block text-xs font-semibold">Progress note for selected task<textarea name="progressNote" rows={2} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
    <label className="block text-xs font-semibold">Minutes spent on selected task<input name="minutesSpent" type="number" min="0" max="1440" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Blockers<textarea name="blockers" rows={2} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label><label className="block text-xs font-semibold">Next plan<textarea name="nextPlan" rows={2} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm"/></label></div>
    {message && <p role={isError ? "alert" : "status"} aria-live="polite" className={`text-xs ${isError ? "text-rose-600" : "text-slate-500"}`}>{message}</p>}
    <button type="submit" disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save journal"}</button>
  </form>;
}
