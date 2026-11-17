"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const password = new FormData(event.currentTarget).get("password");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message ?? "Unable to accept invitation.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Could not reach the server. Your invitation was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8"><div className="mb-5 flex items-center gap-3"><Image src="/brand/hexvault-logo.png" alt="" width={72} height={72} priority className="size-[72px] rounded-lg bg-neutral-950 object-contain"/><span className="text-sm font-bold tracking-[.16em] text-neutral-900">HEXVAULT</span></div><h1 className="mt-5 text-2xl font-semibold">Accept your invitation</h1><p className="mt-2 text-sm text-slate-500">Create a password with at least 14 characters to activate your account.</p><input required minLength={14} type="password" name="password" autoComplete="new-password" className="mt-6 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"/>{error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}<button disabled={busy} className="mt-4 h-11 w-full rounded-lg bg-[#f46327] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Activating…" : "Activate account"}</button></form></main>;
}
