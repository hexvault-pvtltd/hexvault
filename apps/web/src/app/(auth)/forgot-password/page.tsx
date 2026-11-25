"use client";

import { FormEvent, useState } from "react";
import { useAppLoading } from "@/components/app-loading";

export default function ForgotPassword() {
  const { startLoading, finishLoading } = useAppLoading();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);
    setMessage("");
    setError(false);
    startLoading();
    try {
      const response = await fetch("/api/v1/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(true);
        setMessage(body?.error?.message ?? "Could not submit your request. Try again.");
        return;
      }
      setMessage(body?.data?.message ?? "If an active account matches, HR or an Owner will be notified.");
    } catch {
      setError(true);
      setMessage("Could not reach the server. Try again shortly.");
    } finally {
      finishLoading();
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8"><a href="/login" className="text-xs font-semibold text-[#c74410]">← Back to sign in</a><h1 className="mt-6 text-2xl font-semibold">Reset your password</h1><p className="mt-2 text-sm text-slate-500">Enter your work email. If an active account matches, HR or an Owner will be notified to help you update your password.</p><form onSubmit={submit} className="mt-6"><input required type="email" name="email" placeholder="you@hexvault.com" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/><button disabled={busy} className="mt-4 h-11 w-full rounded-lg bg-[#f46327] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Request password help"}</button></form>{message && <p role={error ? "alert" : "status"} aria-live="polite" className="mt-4 text-xs text-slate-600">{message}</p>}</div></main>;
}
