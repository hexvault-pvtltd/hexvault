"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json().catch(() => null);

      if (!result) throw new Error("The sign-in service is unavailable. Please try again later.");

      if (!response.ok) throw new Error(result.error?.message ?? "We couldn’t sign you in. Check your details and try again.");
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t sign you in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen min-w-0 bg-[#f7f7f6] lg:grid-cols-[1.02fr_.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#111111] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-44 -top-40 size-[620px] rounded-full border border-white/[.07]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-4 size-[350px] rounded-full border border-white/[.06]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-24 size-[480px] rounded-full bg-[#ed4e19]/10 blur-[100px]" />

        <Link href="/" aria-label="HEXVAULT home" className="relative inline-flex w-fit items-center gap-3 rounded-xl focus-visible:outline-white">
          <Image src="/brand/hexvault-logo.png" alt="" width={112} height={112} priority className="size-24 rounded-lg object-contain" />
          <span className="text-sm font-bold tracking-[.2em] text-white">HEXVAULT</span>
        </Link>

        <div className="relative max-w-xl pb-8 xl:pb-12">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/70">
            <Sparkles size={13} className="text-[#f15a24]" aria-hidden="true" />
            YOUR TEAM WORKSPACE
          </div>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-.045em] xl:text-6xl">
            Great work
            <br />
            starts with
            <br />
            <span className="text-[#f15a24]">great teams.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/60 xl:text-base">
            One clear place to support your people, collaborate on work, and keep day-to-day operations moving.
          </p>

          <div className="mt-10 flex flex-wrap gap-2 text-xs text-white/70">
            {["People", "Attendance", "Projects", "Team chat"].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-2">{item}</span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} HEXVAULT <span className="mx-1.5 text-white/20">/</span> People operations, made clear.</p>
      </section>

      <section className="flex min-h-screen min-w-0 items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-[440px]">
          <Link href="/" aria-label="HEXVAULT home" className="mb-8 inline-flex items-center gap-3 lg:hidden">
            <Image src="/brand/hexvault-logo.png" alt="" width={72} height={72} priority className="size-[72px] rounded-lg bg-neutral-950 object-contain" />
            <span className="text-sm font-bold tracking-[.16em] text-neutral-900">HEXVAULT</span>
          </Link>

          <div className="rounded-2xl border border-black/[.06] bg-white p-6 shadow-[0_18px_60px_-32px_rgba(0,0,0,.2)] sm:p-9">
            <div className="mb-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.2em] text-[#c94a1c]">Team sign in</p>
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-.035em] text-neutral-950 sm:text-[32px]">Welcome back.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your HEXVAULT work account.</p>
            </div>

            <form className="space-y-5" onSubmit={submit} aria-busy={busy}>
              <label className="block text-xs font-semibold text-neutral-800" htmlFor="login-email">
                Work email
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  inputMode="email"
                  placeholder="you@hexvault.com"
                  className="mt-2 block h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal text-neutral-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#e65320] focus:ring-4 focus:ring-[#e65320]/10"
                />
              </label>

              <div>
                <label className="block text-xs font-semibold text-neutral-800" htmlFor="login-password">Password</label>
                <div className="relative mt-2">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="block h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-12 text-sm text-neutral-900 outline-none transition hover:border-slate-300 focus:border-[#e65320] focus:ring-4 focus:ring-[#e65320]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-neutral-800 focus-visible:outline-[#e65320]"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="-mt-1 flex justify-end">
                <Link href="/forgot-password" className="rounded text-xs font-medium text-[#b8441b] underline-offset-4 hover:underline focus-visible:outline-[#e65320]">Forgot password?</Link>
              </div>

              {error && <p role="alert" aria-live="polite" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline-[#e65320] disabled:cursor-wait disabled:opacity-65"
              >
                {busy ? "Signing in…" : "Sign in"}
                {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#f7f7f6] p-3.5 text-xs leading-5 text-slate-500">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-neutral-700" aria-hidden="true" />
              <span>Your account is protected with secure, session-based access.</span>
            </div>
          </div>

          <div className="mt-6 text-center text-sm"><a href="/verify-certificate" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 font-semibold text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"><ShieldCheck size={17} aria-hidden="true"/>Verify an employment certificate<ArrowRight size={16} aria-hidden="true"/></a></div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">Need an account? Ask your HEXVAULT administrator for an invitation.</p>
          <p className="mt-8 text-center text-[10px] uppercase tracking-[.14em] text-slate-400 lg:hidden">© {new Date().getFullYear()} HEXVAULT</p>
        </div>
      </section>
    </main>
  );
}
