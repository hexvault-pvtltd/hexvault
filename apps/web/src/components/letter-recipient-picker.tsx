"use client";

import { useEffect, useState } from "react";

export type LetterRecipient = { id: string; employeeCode: string; fullName: string; workEmail: string; phone: string | null; title: string | null; lifecycleStatus: string };
export type LetterCurrentUser = { userId: string; employeeId: string | null; fullName: string; email: string; phone: string; title: string };
export function LetterRecipientPicker({ currentUser, selectedId, onSelect, onSelf, disabled, canCreate, onCreate }: {
  currentUser: LetterCurrentUser | null; selectedId: string; onSelect: (recipient: LetterRecipient | null) => void; onSelf: () => void; disabled: boolean; canCreate: boolean; onCreate: () => void;
}) {
  const [query, setQuery] = useState(""), [items, setItems] = useState<LetterRecipient[]>([]), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      fetch(`/api/v1/letters/recipients?q=${encodeURIComponent(query)}`, { cache: "no-store" }).then(async response => {
        const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Unable to search employees.");
        if (active) { setItems(body.data.items); setError(""); }
      }).catch(error => { if (active) setError(error.message); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
    {currentUser && <p className="text-xs text-slate-600">Signed in: <strong>{currentUser.fullName}</strong> / {currentUser.email} / {currentUser.phone || "No phone saved"}</p>}
    <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-semibold">Find an existing employee<input disabled={disabled} value={query} maxLength={100} onChange={event => setQuery(event.target.value)} placeholder="Search name, employee number, or email" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"/></label><label className="text-xs font-semibold">Document recipient<select aria-label="Select employee recipient" disabled={disabled} value={selectedId} onChange={event => {
      if (event.target.value === "self") onSelf(); else onSelect(items.find(item => item.id === event.target.value) ?? null);
    }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Enter recipient manually</option>{currentUser && <option value="self">My details / {currentUser.fullName}</option>}{selectedId && selectedId !== "self" && !items.some(item => item.id === selectedId) && <option value={selectedId}>Selected employee / search to change</option>}{items.map(item => <option key={item.id} value={item.id}>{item.fullName} / {item.employeeCode}{item.lifecycleStatus === "EXITED" ? " / Former employee" : ""}</option>)}</select></label></div>
    <p className="text-xs text-slate-500">Choosing an employee fills their name, email, WhatsApp number, and job title. You can edit the details below.</p>
    {error && <p role="alert" className="text-xs text-rose-700">{error} You can still enter recipient details manually.</p>}
    {canCreate ? <button type="button" disabled={disabled} onClick={onCreate} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">Employee not listed? Create employee and return</button> : <p className="text-xs text-slate-500">If the employee is missing, ask HR or the owner to create their record.</p>}
  </div>;
}
