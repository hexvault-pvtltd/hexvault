"use client";

import { FormEvent, useState } from "react";

export function LeaveRequestForm({ types, onSuccess }: { types: Array<{ id: string; name: string }>; onSuccess?: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/v1/leave/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leaveTypeId: fields.get("leaveTypeId"),
          startDate: fields.get("startDate"),
          endDate: fields.get("endDate"),
          partialDay: fields.get("partialDay") === "on",
          reason: fields.get("reason"),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(result.error?.message ?? "Could not submit request.");
        return;
      }

      setMessage("Your request was submitted.");
      form.reset();
      if (onSuccess) { onSuccess(); window.location.reload(); }
      else window.location.reload();
    } catch {
      setIsError(true);
      setMessage("Unable to reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "mt-1.5 h-10 w-full rounded-xl border border-[#ececea] bg-white px-3 text-xs text-[#25251f] outline-none transition focus:border-[#ff9b79] focus:ring-2 focus:ring-[#ff794f]/10";

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-xs leading-5 text-[#898989]">Choose dates and a leave type. Your request will be routed to the appropriate reviewer.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[10px] font-semibold text-[#686862]">
          Leave type
          <select required name="leaveTypeId" className={fieldClass} defaultValue="">
            <option value="" disabled>Select leave type</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>
        <label className="block text-[10px] font-semibold text-[#686862]">
          Start date
          <input required name="startDate" type="date" className={fieldClass} />
        </label>
        <label className="block text-[10px] font-semibold text-[#686862]">
          End date
          <input required name="endDate" type="date" className={fieldClass} />
        </label>
        <label className="block text-[10px] font-semibold text-[#686862] sm:col-span-2">
          Reason
          <input required name="reason" maxLength={2000} placeholder="Add a short reason" className={fieldClass} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <label className="flex min-h-9 items-center gap-2 text-[11px] text-[#686862]">
            <input name="partialDay" type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[#ff794f]" />
            Partial day (0.5 day)
          </label>
          <button type="submit" disabled={busy || types.length === 0} className="min-h-10 w-full rounded-full bg-[#ff794f] px-5 text-xs font-semibold text-white transition hover:bg-[#f16a40] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            {busy ? "Submitting…" : "Submit leave request"}
          </button>
        </div>
      </div>
      {types.length === 0 && <p className="mt-3 text-xs text-slate-500">There are no active leave types available for requests.</p>}
      {message && <p role={isError ? "alert" : "status"} aria-live="polite" className={`mt-3 text-xs ${isError ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
    </form>
  );
}
