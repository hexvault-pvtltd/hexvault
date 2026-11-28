"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { clearOptionalDetails, fillTemplate, placeholderNames, unresolvedPlaceholders, type LetterContent } from "@core/features/letters/content";
import { defaultLetterLayout, type LetterLayout } from "@core/features/letters/layout-schema";
import { composeLinks, type ShareChannel } from "@core/features/letters/sharing";
import { LetterDesigner } from "./letter-designer";
import { LetterJsonPanel } from "./letter-json-panel";
import { LetterRecipientPicker, type LetterCurrentUser, type LetterRecipient } from "./letter-recipient-picker";
import { recipientPhone } from "@core/features/letters/contact";
import { parseLetterJson } from "@core/features/letters/json";
import { clearLetterEditorDraft, loadLetterEditorDraft, saveLetterEditorDraft } from "@/lib/letter-editor-draft";

type Letter = LetterContent & { id: string; revision: number; status: string; feedback: string | null; approvedAt: string | null; sentAt: string | null; deliveryMethod: string | null };
type Template = { id: string; name: string; title: string; body: string; emailSubject: string; emailBody: string; whatsappText?: string; layout?: LetterLayout | null };
type ShareData = { filename: string; pdf: string; recipientEmail: string; recipientPhone: string; subject: string; emailText: string; whatsappText: string };
const field = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal";
const button = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50";
const primary = "rounded-lg bg-[#f46327] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const initial: LetterContent = { title: "", companyName: "HEXVAULT", recipientName: "", recipientEmail: "", recipientPhone: "", documentDate: "", body: "", emailSubject: "Your document", emailBody: "Dear recipient,\n\nPlease find your approved document attached.\n\nRegards,\nHuman Resources", whatsappText: "Hello, please find your approved document attached.", layout: defaultLetterLayout() };
async function api(path: string, method = "GET", data?: unknown) {
  const response = await fetch(path, { method, cache: "no-store", ...(data ? { headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "Unable to complete this action.");
  return body.data;
}
function download(file: File) {
  const url = URL.createObjectURL(file), anchor = document.createElement("a");
  anchor.href = url; anchor.download = file.name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function LetterManager() {
  const router = useRouter();
  const [items, setItems] = useState<Letter[]>([]), [templates, setTemplates] = useState<Template[]>([]), [roles, setRoles] = useState<string[]>([]);
  const [content, setContent] = useState(initial), [selected, setSelected] = useState<Letter | null>(null);
  const [values, setValues] = useState<Record<string, string>>({}), [templateId, setTemplateId] = useState(""), [templateName, setTemplateName] = useState("");
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Letter | null>(null), [feedback, setFeedback] = useState("");
  const [prepared, setPrepared] = useState<{ id: string; revision: number; data: ShareData; file: File } | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [currentUser, setCurrentUser] = useState<LetterCurrentUser | null>(null), [recipientId, setRecipientId] = useState("");
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);
  const sessionRef = useRef<LetterCurrentUser | null>(null), initializedRecipient = useRef(false);
  const reviewRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (review) reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [review]);
  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [error]);
  const choosePerson = useCallback((person: { id: string; fullName: string; email: string; phone: string | null; title: string | null }) => {
    setRecipientId(person.id);
    setContent(previous => ({ ...previous, recipientName: person.fullName, recipientEmail: person.email, recipientPhone: recipientPhone(person.phone) }));
    setValues(previous => ({ ...previous, job_title: person.title ?? "" }));
  }, []);
  const load = useCallback(async () => {
    const data = await api("/api/v1/letters");
    setItems(data.items); setTemplates(data.templates); setRoles(data.roles);
    setContent(previous => ({ ...previous, companyName: previous.companyName === "HEXVAULT" ? data.companyName : previous.companyName }));
    const actor: LetterCurrentUser | null = data.currentUser ?? null;
    setCurrentUser(actor); sessionRef.current = actor;
    setCanCreateEmployee(Boolean(data.canCreateEmployee));
    if (actor && !initializedRecipient.current) {
      initializedRecipient.current = true;
      if (new URLSearchParams(window.location.search).get("resume") !== "1") choosePerson({ ...actor, id: "self" });
    }
    return data.items as Letter[];
  }, [choosePerson]);
  useEffect(() => {
    setContent(previous => ({ ...previous, documentDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) }));
    void (async () => {
      const records = await load();
      const params = new URLSearchParams(window.location.search), actor = sessionRef.current;
      if (params.get("resume") !== "1" || !actor) return;
      const draft = await loadLetterEditorDraft(actor.userId);
      if (!draft && !params.has("recipient")) choosePerson({ ...actor, id: "self" });
      if (draft) {
        const restored = parseLetterJson(JSON.stringify(draft.content), initial).content;
        const original = draft.documentId ? records.find(record => record.id === draft.documentId && record.revision === draft.revision) ?? null : null;
        setContent(restored); setSelected(original); setValues(draft.values); setTemplateId(draft.templateId); setTemplateName(draft.templateName); setRecipientId("");
        setMessage(draft.documentId && !original ? "Your text was restored as a new draft because the saved document changed while you were away." : "Your unfinished letter has been restored.");
      }
      if (params.has("recipient")) {
        const result = await api(`/api/v1/letters/recipients?id=${encodeURIComponent(params.get("recipient")!)}`);
        const employee = result.items[0] as LetterRecipient | undefined;
        if (!employee) throw new Error("The employee is not available in your scope. Your letter is restored; choose another recipient or enter their details manually.");
        choosePerson({ id: employee.id, fullName: employee.fullName, email: employee.workEmail, phone: employee.phone, title: employee.title });
      }
      await clearLetterEditorDraft(actor.userId).catch(() => {});
      const url = new URL(window.location.href); url.searchParams.delete("resume"); url.searchParams.delete("recipient"); window.history.replaceState(window.history.state, "", url.pathname + url.search);
    })().catch(error => setError(error.message)).finally(() => setLoading(false));
  }, [load, choosePerson]);
  function update<K extends keyof LetterContent>(key: K, value: LetterContent[K]) { if (["recipientName", "recipientEmail", "recipientPhone"].includes(key)) setRecipientId(""); setContent(previous => ({ ...previous, [key]: value })); }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await task(); } catch (error) { setError(error instanceof Error ? error.message : "Unable to complete this action."); }
    finally { setBusy(false); }
  }
  function newLetter() { setSelected(null); setPrepared(null); setTemplateId(""); setTemplateName(""); setValues({}); setContent(previous => ({ ...initial, companyName: previous.companyName, documentDate: previous.documentDate, layout: defaultLetterLayout() })); if (currentUser) choosePerson({ ...currentUser, id: "self" }); else setRecipientId(""); }
  function edit(letter: Letter) {
    setSelected(letter); setPrepared(null); setRecipientId("");
    setContent({ title: letter.title, companyName: letter.companyName, recipientName: letter.recipientName, recipientEmail: letter.recipientEmail, documentDate: letter.documentDate, body: letter.body, emailSubject: letter.emailSubject, emailBody: letter.emailBody, recipientPhone: letter.recipientPhone ?? "", whatsappText: letter.whatsappText || letter.emailBody, layout: letter.layout ?? defaultLetterLayout() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function applyTemplate() {
    const template = templates.find(item => item.id === templateId); if (!template) return;
    const data = { ...values, candidate_name: content.recipientName, company_name: content.companyName, date: content.documentDate };
    setContent(previous => ({ ...previous, title: fillTemplate(template.title, data), body: fillTemplate(template.body, data), emailSubject: fillTemplate(template.emailSubject, data), emailBody: fillTemplate(template.emailBody, data), whatsappText: fillTemplate(template.whatsappText || previous.whatsappText || template.emailBody, data), layout: template.layout ? { ...structuredClone(template.layout), blocks: template.layout.blocks.map(block => ({ ...block, text: fillTemplate(block.text, data) })) } : previous.layout }));
  }
  async function saveTemplate() {
    await run(async () => {
      const result = await api("/api/v1/letter-templates", "POST", { name: templateName, title: content.title, body: content.body, emailSubject: content.emailSubject, emailBody: content.emailBody, whatsappText: content.whatsappText, layout: content.layout });
      const item = result.item as Template;
      setTemplates(previous => [...previous.filter(template => template.id !== item.id), item]);
      setTemplateId(item.id); await load();
      setMessage(`Custom template "${item.name}" saved in the reusable template list.`);
    });
  }
  async function createEmployee() {
    await run(async () => {
      if (!currentUser) throw new Error("Your session details are not ready. Refresh the page before creating an employee.");
      await saveLetterEditorDraft(currentUser.userId, { content, documentId: selected?.id ?? null, revision: selected?.revision ?? null, templateId, templateName, values });
      router.push("/workforce/new?returnTo=letters");
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const cleaned = clearOptionalDetails(content);
      const missing = unresolvedPlaceholders(cleaned);
      if (missing.length) throw new Error(`Complete or remove these template fields before saving: ${missing.map(name => `{{${name}}}`).join(", ")}.`);
      setContent(cleaned);
      const data = await api(selected ? `/api/v1/letters/${selected.id}` : "/api/v1/letters", selected ? "PATCH" : "POST", selected ? { revision: selected.revision, content: cleaned } : cleaned);
      setSelected(data.item); setPrepared(null); await load(); setMessage("Draft saved. Submit it for owner approval when ready.");
    });
  }
  async function action(letter: Letter, action: "SUBMIT" | "APPROVE" | "RETURN") {
    await run(async () => {
      await api(`/api/v1/letters/${letter.id}/actions`, "POST", { revision: letter.revision, action, ...(action === "RETURN" ? { feedback } : {}) });
      setReview(null); setPrepared(null); setFeedback("");
      const latest = await load(); if (selected?.id === letter.id) setSelected(latest.find(item => item.id === letter.id) ?? null);
      setMessage(action === "SUBMIT" ? "Submitted to the owner for approval." : action === "APPROVE" ? "Approved. The owner or HR can now share this revision." : "Returned for changes.");
    });
  }
  async function prepare(letter: Letter, channel: ShareChannel, popup?: Window | null) {
    try {
      const data: ShareData = await api(`/api/v1/letters/${letter.id}/share`, "POST", { revision: letter.revision, channel });
      const bytes = Uint8Array.from(atob(data.pdf), character => character.charCodeAt(0));
      const file = new File([bytes], data.filename, { type: "application/pdf" });
      setPrepared({ id: letter.id, revision: letter.revision, data, file });
      setCanShareFile(Boolean(navigator.canShare?.({ files: [file] })));
      if (channel !== "DEVICE") {
        download(file);
        const links = composeLinks(data);
        const link = channel === "GMAIL" ? links.gmail : channel === "WHATSAPP" ? links.whatsapp : links.email;
        if (popup) popup.location.href = link;
        else if (channel === "EMAIL") window.location.href = link;
        else throw new Error("The browser blocked the composer window. Allow pop-ups and try again; the PDF is downloaded.");
        setMessage("PDF downloaded and the message is ready. Attach the downloaded PDF in the composer, then send it there.");
      } else setMessage("Approved PDF ready. Use Share PDF to choose Gmail or WhatsApp on a supported device, or use a composer button.");
    } catch (error) { popup?.close(); throw error; }
  }
  function openComposer(letter: Letter, channel: ShareChannel) {
    if (busy) return;
    const popup = channel === "GMAIL" || channel === "WHATSAPP" ? window.open("about:blank", "_blank") : null;
    if (popup) popup.opener = null;
    void run(() => prepare(letter, channel, popup));
  }
  async function shareFile() {
    if (!prepared || !canShareFile) return;
    // This is a separate user click so the file share retains browser activation.
    try { await navigator.share({ files: [prepared.file], title: prepared.data.subject, text: prepared.data.whatsappText }); setMessage("Shared with the selected app. Complete sending in that app."); }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setError("File sharing is unavailable here. Use a composer button and attach the downloaded PDF."); }
  }
  const editable = !selected || ["DRAFT", "CHANGES_REQUESTED", "APPROVED"].includes(selected.status);
  const ready = prepared && review?.id === prepared.id && review.revision === prepared.revision ? prepared : null;
  return <div className="space-y-6">
    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The owner must review and approve each document before the owner or HR can prepare sharing. Editing text, layout, signatures, recipients, or messages clears approval. Gmail and WhatsApp open on your device; no email account connection is needed.</p>
    {error && <p ref={errorRef} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <LetterJsonPanel content={content} disabled={busy || !editable} templateName={templateName} onImport={(next, name) => { setContent(next); setTemplateId("custom"); setTemplateName(name ?? ""); setRecipientId(""); setPrepared(null); setReview(null); }}/>
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{selected ? `Edit document / revision ${selected.revision}` : "Prepare any letter or certificate"}</h2><button type="button" className={button} disabled={busy} onClick={newLetter}>New document</button></div>
      <form onSubmit={save} className="mt-4 space-y-4"><fieldset disabled={busy || !editable} className="grid gap-4 md:grid-cols-2">
        <LetterRecipientPicker currentUser={currentUser} selectedId={recipientId} onSelect={employee => { if (employee) choosePerson({ id: employee.id, fullName: employee.fullName, email: employee.workEmail, phone: employee.phone, title: employee.title }); else setRecipientId(""); }} onSelf={() => { if (currentUser) choosePerson({ ...currentUser, id: "self" }); }} disabled={busy || !editable} canCreate={canCreateEmployee} onCreate={createEmployee}/>
        {([ ["recipientName", "Candidate / recipient name", "text", 120, true], ["recipientEmail", "Recipient email (optional)", "email", 254, false], ["recipientPhone", "WhatsApp number with country code (optional)", "tel", 16, false], ["companyName", "Company name", "text", 120, true], ["documentDate", "Document date", "date", 10, true] ] as const).map(([key, label, type, max, required]) => <label key={key} className="text-xs font-semibold">{label}<input required={required} type={type} maxLength={max} value={content[key] ?? ""} onChange={event => update(key, event.target.value)} className={field}/></label>)}
        <div className="space-y-3 rounded-lg bg-slate-50 p-4 md:col-span-2"><label className="text-xs font-semibold">Reusable template<select value={templateId} onChange={event => { setTemplateId(event.target.value); if (event.target.value === "custom") setTemplateName(""); }} className={field}><option value="">Choose a template or write your own</option><option value="custom">Custom template (create new)</option>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{templateId === "custom" && <div className="rounded-lg border border-slate-200 bg-white p-3"><label className="text-xs font-semibold">Custom template name<input value={templateName} maxLength={100} onChange={event => setTemplateName(event.target.value)} className={field}/></label><p className="mt-2 text-xs text-slate-500">Write your content and arrange the document below, then save it here. It will appear in this list for future letters.</p><button type="button" disabled={busy || !templateName.trim()} className={`${button} mt-3`} onClick={saveTemplate}>Save custom template to list</button></div>}<div className="grid gap-3 md:grid-cols-3">{["job_title", "start_date", "end_date", "project_name", "custom_details"].map(key => <label key={key} className="text-xs font-semibold">{key.replaceAll("_", " ")}<input type={key.endsWith("date") ? "date" : "text"} maxLength={2000} value={values[key] ?? ""} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} className={field}/></label>)}</div><button type="button" disabled={!templateId || templateId === "custom"} className={button} onClick={applyTemplate}>Insert template and details</button><p className="text-xs text-slate-500">Insert after filling the details. You can edit every inserted text block. Upload a letterhead or certificate background in the designer below.</p></div>
        <label className="text-xs font-semibold md:col-span-2">Document title<input required maxLength={120} value={content.title} onChange={event => update("title", event.target.value)} className={field}/></label>
        <label className="text-xs font-semibold md:col-span-2">Your letter / certificate text<textarea required minLength={1} maxLength={16000} rows={7} value={content.body} onChange={event => update("body", event.target.value)} className={field}/><span className="mt-1 block font-normal text-slate-500">The body flows across pages. Place your signature in its own block to keep it after the text.</span></label>
        <div className="md:col-span-2"><LetterDesigner key={selected?.id ?? "new-document"} fields={content} value={content.layout} onChange={layout => update("layout", layout)} disabled={busy || !editable}/></div>
        <label className="text-xs font-semibold md:col-span-2">Email subject<input required maxLength={180} value={content.emailSubject} onChange={event => update("emailSubject", event.target.value)} className={field}/></label>
        <label className="text-xs font-semibold">Email message<textarea required minLength={10} maxLength={8000} rows={4} value={content.emailBody} onChange={event => update("emailBody", event.target.value)} className={field}/></label>
        <label className="text-xs font-semibold">WhatsApp message<textarea required maxLength={8000} rows={4} value={content.whatsappText ?? ""} onChange={event => update("whatsappText", event.target.value)} className={field}/></label>
        <div className="md:col-span-2"><button className={primary}>{busy ? "Saving..." : selected?.status === "APPROVED" ? "Save changes and clear approval" : "Save draft"}</button></div>
      </fieldset></form>
      <details className="mt-5 rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">Save this layout as a reusable template</summary><p className="mt-2 text-xs text-slate-500">Saves the background, page setup, blocks, signature images, title, body, and email copy. Placeholders: {placeholderNames.map(name => `{{${name}}}`).join(", ")}. Personal signatures are included in this template; owner/HR templates are available to managers.</p><label className="mt-3 block text-xs font-semibold">Template name<input value={templateName} maxLength={100} onChange={event => setTemplateName(event.target.value)} className={field}/></label><button type="button" disabled={busy || !templateName.trim()} className={`${button} mt-3`} onClick={saveTemplate}>Save template</button></details>
    </section>
    <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Documents and approval queue</h2><button disabled={busy} className={button} onClick={() => run(async () => { await load(); })}>Refresh</button></div>
      {loading ? <p className="mt-4 text-sm" role="status">Loading documents...</p> : !items.length ? <p className="mt-4 text-sm text-slate-500">No documents yet. Save a draft above.</p> : <ul className="mt-3 divide-y divide-slate-100">{items.map(item => <li key={item.id} className="space-y-3 py-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.recipientName} / {item.recipientEmail || item.recipientPhone || "No contact provided"} / {item.documentDate}</p></div><span className="text-xs font-semibold">{item.status.replaceAll("_", " ")} / v{item.revision}</span></div>{item.feedback && <p className="whitespace-pre-wrap rounded-lg bg-amber-50 p-3 text-sm">Owner feedback: {item.feedback}</p>}<div className="flex flex-wrap gap-2"><a className={button} href={`/api/v1/letters/${item.id}/pdf`}>{item.approvedAt ? "Download approved PDF" : "Preview draft PDF"}</a><button disabled={busy} className={button} onClick={() => { setReview(item); setPrepared(null); setFeedback(""); }}>Review / share</button>{["DRAFT", "CHANGES_REQUESTED", "APPROVED"].includes(item.status) && <button disabled={busy} className={button} onClick={() => edit(item)}>Edit</button>}{["DRAFT", "CHANGES_REQUESTED"].includes(item.status) && <button disabled={busy} className={button} onClick={() => action(item, "SUBMIT")}>Request owner approval</button>}</div></li>)}</ul>}
    </section>
    {review && <section ref={reviewRef} aria-label="Review document" className="space-y-4 rounded-xl border-2 border-orange-200 bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold">Review: {review.title} / v{review.revision}</h2><button className={button} onClick={() => setReview(null)}>Close</button></div><p className="text-sm">To: {review.recipientName} / {review.recipientEmail || "No email"} / {review.recipientPhone || "No WhatsApp number"}</p><LetterDesigner key={`review-${review.id}-${review.revision}`} fields={review} value={review.layout} onChange={() => {}} readOnly approved={Boolean(review.approvedAt)}/><div className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold">Email: {review.emailSubject}</p><p className="mt-3 whitespace-pre-wrap text-sm">{review.emailBody}</p></div><div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold">WhatsApp message</p><p className="mt-3 whitespace-pre-wrap text-sm">{review.whatsappText || review.emailBody}</p></div></div>
      {roles.includes("OWNER") && review.status === "PENDING_APPROVAL" && <div className="space-y-3"><label className="text-xs font-semibold">Reason for changes<textarea maxLength={2000} value={feedback} onChange={event => setFeedback(event.target.value)} className={field}/></label><div className="flex gap-2"><button disabled={busy} className={primary} onClick={() => action(review, "APPROVE")}>Approve this revision</button><button disabled={busy || !feedback.trim()} className={button} onClick={() => action(review, "RETURN")}>Return for changes</button></div></div>}
      {roles.some(role => ["OWNER", "HR"].includes(role)) && review.status === "APPROVED" && <div className="space-y-3 rounded-lg bg-slate-50 p-4"><h3 className="text-sm font-semibold">Share the approved PDF</h3><p className="text-xs leading-5 text-slate-600">Gmail, email, and WhatsApp buttons download the PDF and open your prepared text. Attach the PDF in that app. On supported devices, Prepare file sharing enables Share PDF with the file included. You complete sending in the selected app.</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => openComposer(review, "GMAIL")}>Gmail</button><button disabled={busy} className={button} onClick={() => openComposer(review, "EMAIL")}>Email app</button><button disabled={busy} className={button} onClick={() => openComposer(review, "WHATSAPP")}>WhatsApp</button><button disabled={busy} className={button} onClick={() => run(() => prepare(review, "DEVICE"))}>{busy ? "Preparing..." : "Prepare file sharing"}</button></div>{ready && <div className="flex flex-wrap items-center gap-2"><button disabled={!canShareFile} className={primary} onClick={shareFile}>Share PDF with file</button><button className={button} onClick={() => download(ready.file)}>Download PDF</button>{!canShareFile && <p className="text-xs text-slate-500">File sharing is unavailable in this browser. Use a composer button and attach the PDF manually.</p>}</div>}<p className="text-xs text-slate-500">Opening a composer is recorded as sharing prepared, not as a sent message.</p></div>}
    </section>}
  </div>;
}
