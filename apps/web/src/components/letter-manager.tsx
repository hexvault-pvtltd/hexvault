"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { fillTemplate, placeholderNames, type LetterContent } from "@core/features/letters/content";

type Letter = LetterContent & { id: string; revision: number; status: string; feedback: string | null; approvedAt: string | null; sentAt: string | null; deliveryMethod: string | null };
type Template = { id: string; name: string; title: string; body: string; emailSubject: string; emailBody: string };
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal";
const buttonClass = "rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50";
const initial: LetterContent = { title: "", companyName: "HEXVAULT", recipientName: "", recipientEmail: "", documentDate: "", body: "", emailSubject: "", emailBody: "" };
async function api(path: string, method = "GET", data?: unknown) {
  const response = await fetch(path, { method, cache: "no-store", ...(data ? { headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to complete this action.");
  return body.data;
}
export function LetterManager() {
  const [items, setItems] = useState<Letter[]>([]), [templates, setTemplates] = useState<Template[]>([]), [roles, setRoles] = useState<string[]>([]);
  const [content, setContent] = useState(initial), [selected, setSelected] = useState<Letter | null>(null);
  const [values, setValues] = useState<Record<string, string>>({}), [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Letter | null>(null), [feedback, setFeedback] = useState(""), [method, setMethod] = useState("EMAIL");
  const reviewRef = useRef<HTMLElement>(null);
  useEffect(() => { if (review) reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [review]);
  const load = useCallback(async () => {
    const data = await api("/api/v1/letters");
    setItems(data.items); setTemplates(data.templates); setRoles(data.roles);
    setContent(previous => ({ ...previous, companyName: previous.companyName === "HEXVAULT" ? data.companyName : previous.companyName }));
    return data.items as Letter[];
  }, []);
  useEffect(() => {
    setContent(previous => ({ ...previous, documentDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) }));
    load().catch(error => setError(error.message)).finally(() => setLoading(false));
  }, [load]);
  function update(key: keyof LetterContent, value: string) { setContent(previous => ({ ...previous, [key]: value })); }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await task(); } catch (error) { setError(error instanceof Error ? error.message : "Unable to complete this action."); }
    finally { setBusy(false); }
  }
  function applyTemplate() {
    const template = templates.find(item => item.id === templateId);
    if (!template) return;
    const data = { ...values, candidate_name: content.recipientName, company_name: content.companyName, date: content.documentDate };
    setContent(previous => ({ ...previous, title: fillTemplate(template.title, data), body: fillTemplate(template.body, data), emailSubject: fillTemplate(template.emailSubject, data), emailBody: fillTemplate(template.emailBody, data) }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const data = await api(selected ? `/api/v1/letters/${selected.id}` : "/api/v1/letters", selected ? "PATCH" : "POST", selected ? { revision: selected.revision, content } : content);
      setSelected(data.item); await load(); setMessage("Draft saved. Submit it for owner approval when ready.");
    });
  }
  async function action(letter: Letter, action: string) {
    await run(async () => {
      await api(`/api/v1/letters/${letter.id}/actions`, "POST", { revision: letter.revision, action, ...(action === "RETURN" ? { feedback } : {}), ...(action === "SEND" ? { method } : {}) });
      setReview(null); setFeedback("");
      const latest = await load();
      if (selected?.id === letter.id) setSelected(latest.find(item => item.id === letter.id) ?? null);
      setMessage(action === "SEND" ? "Approved PDF accepted by the email provider." : action === "SUBMIT" ? "Submitted to the owner for approval." : action === "APPROVE" ? "Approved. HR can now send this revision." : "Returned for changes.");
    });
  }
  const editable = !selected || ["DRAFT", "CHANGES_REQUESTED", "APPROVED"].includes(selected.status);
  return <div className="space-y-6">
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Only the owner can approve. Only HR can send. Changing an approved letter, recipient, or email message requires approval again.</p>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{selected ? `Edit draft · revision ${selected.revision}` : "Prepare a letter or certificate"}</h2>{selected && <button type="button" className={buttonClass} onClick={() => { setSelected(null); setContent(previous => ({ ...initial, companyName: previous.companyName, documentDate: previous.documentDate })); }}>New letter</button>}</div>
      <form onSubmit={save} className="mt-4 space-y-4"><fieldset disabled={busy || !editable} className="grid gap-4 md:grid-cols-2">
        {([ ["recipientName", "Candidate / employee name", "text", 120], ["recipientEmail", "Recipient email", "email", 254], ["companyName", "Company name", "text", 120], ["documentDate", "Letter date", "date", 10] ] as const).map(([key, label, type, max]) => <label key={key} className="text-xs font-semibold">{label}<input required type={type} maxLength={max} value={content[key]} onChange={event => update(key, event.target.value)} className={inputClass}/></label>)}
        <div className="space-y-3 rounded-lg bg-slate-50 p-4 md:col-span-2"><label className="text-xs font-semibold">Template<select value={templateId} onChange={event => setTemplateId(event.target.value)} className={inputClass}><option value="">Choose a template or write your own</option>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="grid gap-3 md:grid-cols-3">{["job_title", "start_date", "end_date", "project_name", "custom_details"].map(key => <label key={key} className="text-xs font-semibold">{key.replaceAll("_", " ")}<input type={key.endsWith("date") ? "date" : "text"} maxLength={2000} value={values[key] ?? ""} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} className={inputClass}/></label>)}</div>
          <button type="button" disabled={!templateId} className={buttonClass} onClick={applyTemplate}>Insert template and details</button><p className="text-xs text-slate-500">Insert after filling the fields. You can edit all inserted content below. Fill every placeholder before saving.</p>
        </div>
        <label className="text-xs font-semibold md:col-span-2">Document title<input required maxLength={120} value={content.title} onChange={event => update("title", event.target.value)} className={inputClass}/></label>
        <label className="text-xs font-semibold md:col-span-2">Letter / certificate content<textarea required minLength={20} maxLength={16000} rows={9} value={content.body} onChange={event => update("body", event.target.value)} className={inputClass}/></label>
        <label className="text-xs font-semibold md:col-span-2">Email subject<input required maxLength={180} value={content.emailSubject} onChange={event => update("emailSubject", event.target.value)} className={inputClass}/></label>
        <label className="text-xs font-semibold md:col-span-2">Email message<textarea required minLength={10} maxLength={8000} rows={4} value={content.emailBody} onChange={event => update("emailBody", event.target.value)} className={inputClass}/><span className="mt-1 block font-normal text-slate-500">The PDF is attached automatically. Include only details the recipient should receive. PDF text currently supports Latin characters.</span></label>
        <div className="md:col-span-2"><button className="rounded-lg bg-[#f46327] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : selected?.status === "APPROVED" ? "Save changes and clear approval" : "Save draft"}</button></div>
      </fieldset></form>
      <details className="mt-5 rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Save a reusable text template</summary><p className="mt-2 text-xs text-slate-500">Uses the title, content, subject, and message in the editor. Insert placeholders such as {"{{candidate_name}}"} where needed. Supported: {placeholderNames.join(", ")}.</p><label className="mt-3 block text-xs font-semibold">Template name<input value={templateName} maxLength={100} onChange={event => setTemplateName(event.target.value)} className={inputClass}/></label><button type="button" disabled={busy || !templateName.trim()} className={`${buttonClass} mt-3`} onClick={() => run(async () => { await api("/api/v1/letter-templates", "POST", { name: templateName, title: content.title, body: content.body, emailSubject: content.emailSubject, emailBody: content.emailBody }); await load(); setTemplateName(""); setMessage("Reusable template saved."); })}>Save template</button></details>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Letters and approval queue</h2><button disabled={busy} className={buttonClass} onClick={() => run(async () => { await load(); })}>Refresh</button></div>
      {loading ? <p className="mt-4 text-sm" role="status">Loading letters...</p> : !items.length ? <p className="mt-4 text-sm text-slate-500">No letters yet. Save your first draft above.</p> : <ul className="mt-3 divide-y divide-slate-100">{items.map(item => <li key={item.id} className="space-y-3 py-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.recipientName} · {item.recipientEmail} · {item.documentDate}</p></div><span className="text-xs font-semibold">{item.status.replaceAll("_", " ")} · v{item.revision}</span></div>
        {item.feedback && <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm">Owner feedback: {item.feedback}</p>}
        {["SENDING", "DELIVERY_UNKNOWN"].includes(item.status) && <p className="text-xs text-amber-800">{item.status === "SENDING" ? "Delivery started. If this status persists, check sender logs before preparing another delivery." : "Delivery could not be confirmed. Check sender logs before preparing another delivery."}</p>}
        {item.sentAt && <p className="text-xs text-slate-500">Accepted by {item.deliveryMethod === "GMAIL" ? "Gmail" : "email provider"} on {new Date(item.sentAt).toLocaleString()}</p>}
        <div className="flex flex-wrap gap-2"><a className={buttonClass} href={`/api/v1/letters/${item.id}/pdf`}>{item.approvedAt ? "Download approved PDF" : "Preview draft PDF"}</a><button disabled={busy} className={buttonClass} onClick={() => { setReview(item); setFeedback(""); }}>Review details</button>
          {["DRAFT", "CHANGES_REQUESTED", "APPROVED"].includes(item.status) && <button disabled={busy} className={buttonClass} onClick={() => { setSelected(item); setContent(Object.fromEntries(Object.keys(initial).map(key => [key, item[key as keyof LetterContent]])) as LetterContent); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>}
          {["DRAFT", "CHANGES_REQUESTED"].includes(item.status) && <button disabled={busy} className={buttonClass} onClick={() => action(item, "SUBMIT")}>Request owner approval</button>}
        </div></li>)}</ul>}
    </section>
    {review && <section ref={reviewRef} aria-label="Review letter" className="space-y-4 rounded-xl border-2 border-orange-200 bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold">Review: {review.title} · v{review.revision}</h2><button className={buttonClass} onClick={() => setReview(null)}>Close</button></div><p className="text-sm">To: {review.recipientName} &lt;{review.recipientEmail}&gt; · {review.documentDate}</p><p className="text-sm font-semibold">{review.companyName}</p><pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 font-sans text-sm leading-6">{review.body}</pre><div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold">Email subject: {review.emailSubject}</p><p className="mt-3 whitespace-pre-wrap text-sm">{review.emailBody}</p></div>
      {roles.includes("OWNER") && review.status === "PENDING_APPROVAL" && <div className="space-y-3"><label className="text-xs font-semibold">Reason for changes<textarea maxLength={2000} value={feedback} onChange={event => setFeedback(event.target.value)} className={inputClass}/></label><div className="flex gap-2"><button disabled={busy} className={buttonClass} onClick={() => action(review, "APPROVE")}>Approve this revision</button><button disabled={busy || !feedback.trim()} className={buttonClass} onClick={() => action(review, "RETURN")}>Return for changes</button></div></div>}
      {roles.includes("HR") && review.status === "APPROVED" && <div className="space-y-3"><label className="text-xs font-semibold">Send through<select value={method} onChange={event => setMethod(event.target.value)} className={inputClass}><option value="EMAIL">Company email</option><option value="GMAIL">Gmail</option></select></label><p className="text-xs text-slate-500">This sends the reviewed message and approved PDF to {review.recipientEmail}.</p><button disabled={busy} className="rounded-lg bg-[#f46327] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => action(review, "SEND")}>{busy ? "Sending..." : "Send approved PDF"}</button></div>}
    </section>}
  </div>;
}
