"use client";

import { useState } from "react";

export function EmployeePasswordUpdate({ employeeId }: { employeeId: string }) {
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ employeeName: string; loginEmail: string; temporaryPassword: string; loginUrl: string } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function updatePassword() {
    if (busy) return;
    if (!window.confirm("This will change the employee’s password immediately and sign out all active sessions. Continue?")) return;
    setBusy(true);
    setCredentials(null);
    setMessage("");
    setError(false);
    try {
      const response = await fetch(`/api/v1/employees/${employeeId}/password`, { method: "POST" });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to update the employee password.");
      setCredentials(body.data);
      setMessage("Password updated. Send the template to the employee manually.");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const whatsappTemplate = credentials && [
    `Hi ${credentials.employeeName}, your HEXVAULT password has been updated.`,
    `Login: ${credentials.loginUrl}`,
    `Email: ${credentials.loginEmail}`,
    `Temporary password: ${credentials.temporaryPassword}`,
    "Please sign in and use Forgot password to set a personal password.",
  ].join("\n");

  async function copyTemplate() {
    if (!whatsappTemplate) return;
    try {
      await navigator.clipboard.writeText(whatsappTemplate);
      setMessage("Template copied. Send it manually in WhatsApp.");
      setError(false);
    } catch {
      setMessage("Could not copy automatically. Select and copy the message below.");
      setError(true);
    }
  }

  return <div className="flex flex-wrap items-center gap-3">
    <button type="button" disabled={busy} onClick={updatePassword} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">
      {busy ? "Updating…" : "Generate and set temporary password"}
    </button>
    {credentials && whatsappTemplate && <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold text-amber-900">Temporary password set</p>
      <p className="mt-1 text-[11px] text-amber-800">This password is shown only until you leave or refresh this page. Share it with the employee manually and ask them to replace it after signing in.</p>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p><span className="font-semibold">Login email:</span> {credentials.loginEmail}</p>
        <p><span className="font-semibold">Temporary password:</span> <span className="select-all font-mono">{credentials.temporaryPassword}</span></p>
      </div>
      <label className="mt-3 block text-[10px] font-semibold text-amber-900">WhatsApp message template<textarea readOnly value={whatsappTemplate} rows={5} className="mt-1 block w-full resize-y rounded-lg border border-amber-200 bg-white p-3 font-normal text-slate-700" /></label>
      <button type="button" onClick={copyTemplate} className="mt-3 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white">Copy message</button>
    </div>}
    {message && <p role={error ? "alert" : "status"} aria-live="polite" className={`text-xs ${error ? "text-rose-600" : "text-slate-500"}`}>{message}</p>}
  </div>;
}
