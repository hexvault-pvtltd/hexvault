"use client";

import { useState } from "react";

export function InviteEmployeeButton({ employeeId, owner }: { employeeId: string; owner: boolean }) {
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function invite() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/v1/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ employeeId, role }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(true);
        setMessage(result?.error?.message ?? "Unable to send invitation.");
        return;
      }
      setMessage("Invitation email sent.");
    } catch {
      setError(true);
      setMessage("Could not reach the server. The invitation was not sent.");
    } finally {
      setBusy(false);
    }
  }

  const roles = ["STAFF", "INTERN", "TEAM_LEAD", "HR", "DEPARTMENT_HEAD", ...(owner ? ["OWNER"] : [])];
  return <div className="flex items-center gap-2">{owner && <select aria-label="Invite role" disabled={busy} value={role} onChange={(event) => setRole(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]">{roles.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>}<button type="button" disabled={busy} onClick={invite} className="rounded-lg bg-[#f46327] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Send invitation"}</button>{message && <span role={error ? "alert" : "status"} className={`max-w-44 text-[10px] ${error ? "text-rose-600" : "text-slate-500"}`}>{message}</span>}</div>;
}
