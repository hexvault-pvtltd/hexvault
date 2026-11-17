"use client";

import { FormEvent, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const password = new FormData(event.currentTarget).get("password");
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/v1/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setIsError(true);
        setMessage(body?.error?.message ?? "Unable to update password. Try again.");
        return;
      }
      setMessage("Password updated. You can now sign in.");
    } catch {
      setIsError(true);
      setMessage("Could not reach the server. Your password was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8"><h1 className="text-2xl font-semibold">Choose a new password</h1><p className="mt-2 text-sm text-slate-500">Use at least 14 characters.</p><form onSubmit={submit} className="mt-6"><input required minLength={14} type="password" name="password" autoComplete="new-password" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/><button disabled={busy} className="mt-4 h-11 w-full rounded-lg bg-[#f46327] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button></form>{message && <p role={isError ? "alert" : "status"} aria-live="polite" className="mt-4 text-xs text-slate-600">{message} {!isError && message.startsWith("Password") && <a className="text-[#c74410]" href="/login">Sign in</a>}</p>}</div></main>;
}
