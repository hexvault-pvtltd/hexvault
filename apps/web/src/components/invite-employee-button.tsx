"use client";

import { useState } from "react";

type Invitation = {
  resent?: boolean;
  employeeName: string;
  email: string;
  whatsappNumber: string | null;
  role: string;
  invitationUrl: string;
  expiresAt: string;
};

export function InviteEmployeeButton({ employeeId, whatsappNumber, owner, resend = false }: { employeeId: string; whatsappNumber: string | null; owner: boolean; resend?: boolean }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function createInvitation() {
    if (busy) return;
    setBusy(true);
    setInvitation(null);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/v1/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId, role }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error?.message ?? "Unable to create invitation.");
      setInvitation(result.data);
      setMessage(result.data.resent ? "New invitation link created. Copy the template and send it manually in WhatsApp; the previous link is no longer valid." : "Invitation created. Copy the template and send it manually in WhatsApp.");
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Could not reach the server. The invitation was not created.");
    } finally {
      setBusy(false);
    }
  }

  const expiry = invitation ? new Date(invitation.expiresAt).toLocaleDateString() : "";
  const whatsappTemplate = invitation && [
    `Hi ${invitation.employeeName}, you’ve been invited to join HEXVAULT as ${invitation.role.replaceAll("_", " ")}.`,
    `Login email: ${invitation.email}`,
    `Accept your invitation and set your password here: ${invitation.invitationUrl}`,
    `This link expires on ${expiry}.`,
  ].join("\n");

  async function copyTemplate() {
    if (!whatsappTemplate) return;
    try {
      await navigator.clipboard.writeText(whatsappTemplate);
      setMessage("Invitation copied. Send it manually in WhatsApp.");
      setError(false);
    } catch {
      setMessage("Could not copy automatically. Select and copy the message below.");
      setError(true);
    }
  }

  const roles = ["STAFF", "INTERN", "TEAM_LEAD", "HR", "DEPARTMENT_HEAD", ...(owner ? ["OWNER"] : [])];
  return <div className="flex flex-wrap items-center gap-2">
    {owner && <select aria-label="Invite role" disabled={busy || Boolean(invitation)} value={role} onChange={event => setRole(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px]">{roles.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>}
    <button type="button" disabled={busy || Boolean(invitation)} onClick={createInvitation} className="rounded-lg bg-[#f46327] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{busy ? "Creating link…" : resend ? "Resend WhatsApp invitation" : "Create WhatsApp invitation"}</button>
    {invitation && whatsappTemplate && <div className="basis-full max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-xs font-semibold text-emerald-900">Invitation link created</p>
      <p className="mt-1 text-[10px] text-emerald-800">This link can activate the account. Share it only with the intended employee. It is shown here until you leave or refresh this page.</p>
      <p className="mt-2 text-[10px] text-emerald-900"><span className="font-semibold">Send to WhatsApp:</span> {invitation.whatsappNumber || whatsappNumber || "No number saved; add one in Edit profile."}</p>
      <label className="mt-3 block text-[10px] font-semibold text-emerald-900">WhatsApp message template<textarea readOnly value={whatsappTemplate} rows={6} className="mt-1 block w-full resize-y rounded-lg border border-emerald-200 bg-white p-3 font-normal text-slate-700" /></label>
      <button type="button" onClick={copyTemplate} className="mt-3 rounded-lg bg-emerald-800 px-3 py-2 text-[10px] font-semibold text-white">Copy WhatsApp message</button>
    </div>}
    {message && <span role={error ? "alert" : "status"} className={`text-[10px] ${error ? "text-rose-600" : "text-slate-600"}`}>{message}</span>}
  </div>;
}
