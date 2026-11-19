"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProject() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    const startDate = String(fields.get("startDate") ?? "");
    const dueDate = String(fields.get("dueDate") ?? "");
    if (startDate && dueDate && dueDate < startDate) {
      setError("Due date must be on or after the start date.");
      return;
    }

    const body = Object.fromEntries([...fields.entries()].filter(([, value]) => value !== ""));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message ?? (response.status === 404
          ? "Project creation is unavailable on this deployment. Please contact your administrator."
          : `Could not create project (server response ${response.status}). Please try again.`));
        return;
      }
      if (!result?.data?.id) {
        setError("The server returned an unexpected response. Check the project list before trying again.");
        return;
      }
      router.push("/projects");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f46327] focus:ring-2 focus:ring-[#f46327]/15";

  return (
    <div className="w-full max-w-2xl">
      <p className="text-xs text-slate-400">Operations / Projects / New</p>
      <h1 className="mt-2 text-2xl font-semibold">Create a project</h1>
      <p className="mt-1 text-sm text-slate-500">Create a project and optionally set its dates and description.</p>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <label className="block text-xs font-semibold">Project name
          <input name="name" required minLength={2} maxLength={160} autoComplete="off" className={fieldClass} />
        </label>
        <label className="block text-xs font-semibold">Project code
          <input name="code" required minLength={2} maxLength={32} autoComplete="off" aria-describedby="project-code-help" className={fieldClass} />
          <small id="project-code-help" className="mt-1 block font-normal text-slate-500">Use 2–32 characters. The code is saved in uppercase.</small>
        </label>
        <label className="block text-xs font-semibold">Description
          <textarea name="description" rows={3} maxLength={4000} className="mt-2 block w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-[#f46327] focus:ring-2 focus:ring-[#f46327]/15" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold">Start date
            <input name="startDate" type="date" className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold">Due date
            <input name="dueDate" type="date" className={fieldClass} />
          </label>
        </div>
        {error && <p role="alert" aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => router.push("/projects")} className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy} className="min-h-10 rounded-lg bg-[#f46327] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#dc4b12] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Saving…" : "Save project"}</button>
        </div>
      </form>
    </div>
  );
}
