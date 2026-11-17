"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function DepartmentForm() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const body = Object.fromEntries(new FormData(form)); setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/departments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Unable to create department."); return; }
      form.reset(); router.refresh();
    } catch { setError("Could not reach the server. The department was not created."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"><input required minLength={2} maxLength={100} name="name" placeholder="Department name" className="h-10 min-w-40 flex-1 rounded-lg border border-slate-200 px-3 text-xs"/><input required minLength={2} maxLength={20} name="code" placeholder="Code" className="h-10 w-28 rounded-lg border border-slate-200 px-3 text-xs"/><button disabled={busy} className="rounded-lg bg-[#f46327] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Adding…" : "Add department"}</button>{error && <p role="alert" className="w-full text-xs text-rose-600">{error}</p>}</form>;
}

export function TeamForm({ departments }: { departments: Array<{ id: string; name: string }> }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const fields = new FormData(form); const body = { name: fields.get("name"), departmentId: fields.get("departmentId") }; setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/teams", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json().catch(() => null);
      if (!response.ok) { setError(result?.error?.message ?? "Unable to create team."); return; }
      form.reset(); router.refresh();
    } catch { setError("Could not reach the server. The team was not created."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4"><input required minLength={2} maxLength={100} name="name" placeholder="Team name" className="h-10 min-w-40 flex-1 rounded-lg border border-slate-200 px-3 text-xs"/><select required name="departmentId" className="h-10 rounded-lg border border-slate-200 px-3 text-xs"><option value="">Department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select><button disabled={busy} className="rounded-lg bg-[#f46327] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Adding…" : "Add team"}</button>{error && <p role="alert" className="w-full text-xs text-rose-600">{error}</p>}</form>;
}
