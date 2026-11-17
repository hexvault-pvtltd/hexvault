"use client";

import { FormEvent, useState } from "react";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    if (values.newPassword !== values.confirmPassword) {
      setError(true);
      setMessage("The new passwords do not match.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Unable to change your password.");
      form.reset();
      setMessage("Password changed. Your other active sessions have been signed out.");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="mt-5 max-w-xl space-y-4">
    <label className="block text-xs font-semibold">Current password<input required type="password" name="currentPassword" autoComplete="current-password" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-xs font-semibold">New password<input required type="password" name="newPassword" minLength={14} maxLength={200} autoComplete="new-password" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /><span className="mt-1 block text-[10px] font-normal text-slate-400">Use at least 14 characters.</span></label>
      <label className="block text-xs font-semibold">Confirm new password<input required type="password" name="confirmPassword" minLength={14} maxLength={200} autoComplete="new-password" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
    </div>
    {message && <p role={error ? "alert" : "status"} aria-live="polite" className={`text-xs ${error ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
    <button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Updating…" : "Change password"}</button>
  </form>;
}
