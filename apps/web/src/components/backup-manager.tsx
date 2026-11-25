"use client";
import { uploadPrivateFile } from "@/lib/private-upload";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Clock3, DatabaseBackup, Download, RefreshCw, RotateCcw, Trash2 } from "lucide-react";

type Archive = { id: string; status: string; kind: string; sizeBytes: number | null; recordCount: number | null; fileCount: number | null; triggeredBy: string | null; error: string | null; createdAt: string; completedAt: string | null };
type Schedule = { enabled: boolean; frequency: string; timeUtc: string; retention: number; nextRunAt: string | null };
const MAX_BYTES = 100 * 1024 * 1024;
const card = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
const input = "mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50";
const button = "inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const size = (bytes: number | null) => bytes === null ? "—" : bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request could not be completed.");
  return body.data;
}

export function BackupManager({ initialHistory, initialSchedule, timezone }: { initialHistory: Archive[]; initialSchedule: Schedule; timezone: string }) {
  const date = (value: string) => new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  const [history, setHistory] = useState(initialHistory);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [downloadNow, setDownloadNow] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [restored, setRestored] = useState(false);
  const [progress, setProgress] = useState("");
  const disabled = Boolean(busy) || restored;
  async function refresh() { setHistory(await api<Archive[]>("/api/v1/backups")); }
  useEffect(() => {
    if (!history.some(item => item.status === "RUNNING") || restored) return;
    const timer = setInterval(() => { api<Archive[]>("/api/v1/backups").then(setHistory).catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [history, restored]);
  function begin(action: string) { setBusy(action); setMessage(""); setError(""); }
  async function backup() {
    begin("backup");
    try {
      const archive = await api<Archive>("/api/v1/backups", { method: "POST" });
      setMessage("Backup completed. Your JSON copy includes application records and uploaded files.");
      await refresh();
      if (downloadNow) {
        const link = document.createElement("a");
        link.href = `/api/v1/backups/${archive.id}/download`;
        document.body.appendChild(link); link.click(); link.remove();
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Backup failed."); await refresh().catch(() => undefined); }
    finally { setBusy(""); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); begin("schedule");
    try {
      const updated = await api<Schedule>("/api/v1/backups/schedule", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: schedule.enabled, frequency: schedule.frequency, timeUtc: schedule.timeUtc, retention: schedule.retention }) });
      setSchedule(updated); setMessage("Backup schedule saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save schedule."); }
    finally { setBusy(""); }
  }
  async function chooseFile(selected: File | null) {
    setFile(null); setPreview(""); setError("");
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".json") || selected.size > MAX_BYTES || selected.size === 0) { setError("Choose a non-empty JSON backup of up to 100 MB."); return; }
    begin("preview");
    try {
      const header = JSON.parse(await selected.text());
      if (header.format !== "hexvault-backup" || header.version !== 1 || header.scope !== "APPLICATION" || !header.payload?.tables || !Number.isFinite(Date.parse(header.createdAt))) throw new Error("Choose a valid HEXVAULT JSON backup.");
      setFile(selected); setPreview(`Created ${date(header.createdAt)} · ${size(selected.size)} · Entire application`);
    } catch (error) { setError(error instanceof SyntaxError ? "This file does not contain valid JSON." : error instanceof Error ? error.message : "Unable to read backup."); }
    finally { setBusy(""); }
  }
  async function restore(event: FormEvent) {
    event.preventDefault();
    if (!file || confirmation !== "RESTORE" || !password || disabled) return;
    begin("restore"); setProgress("Uploading your backup…");
    try {
      const { uploadId, upload } = await api<{ uploadId: string; upload: { url: string; fields: Record<string, string>; method?: "POST" | "PUT"; headers?: Record<string, string> } }>("/api/v1/backups/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ size: file.size }) });
      const response = await uploadPrivateFile(upload.url, upload, file);
      if (!response.ok) throw new Error("Backup upload failed. Please retry.");
      setProgress("Validating, saving a recovery backup, and restoring data. Keep this page open…");
      await api("/api/v1/backups/restore", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ uploadId, password, confirmation }) });
      setRestored(true); setPassword(""); setConfirmation(""); setFile(null); setPreview("");
      setMessage("Restore completed. A recovery copy is saved in backup history. All sessions were signed out. Sign in using an owner account and password from the restored backup.");
    } catch (error) { setError(error instanceof Error ? error.message : "Restore failed. Check backup history before retrying."); await refresh().catch(() => undefined); }
    finally { setBusy(""); setProgress(""); }
  }
  async function remove(archive: Archive) {
    if (!window.confirm(`Delete the backup from ${date(archive.createdAt)}? Downloaded copies will remain on your computer.`)) return;
    begin(archive.id);
    try { await api(`/api/v1/backups/${archive.id}`, { method: "DELETE" }); await refresh(); setMessage("Backup deleted."); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to delete backup."); }
    finally { setBusy(""); }
  }
  return <div className="space-y-5">
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}{restored && <a href="/login" className="ml-2 font-semibold underline">Sign in</a>}</div>}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <section className={card}><h2 className="text-sm font-semibold">Backup scope</h2><p className="mt-1 text-xs text-slate-500">Entire application · All departments, employees, accounts, settings, history, and uploaded files.</p><div className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3"><DatabaseBackup size={19} className="mt-0.5 shrink-0 text-orange-600"/><p className="text-xs leading-5 text-slate-600">One portable JSON file, including documents, CDN files, and chat attachments. Backups are compressed in private storage; downloads open as regular JSON. Maximum total JSON size: 100 MB. Backups contain confidential data and password hashes; keep downloaded copies in a secure location.</p></div></section>
    <form onSubmit={save} className={card}>
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={17} className="text-orange-600"/>Automatic backups</h2>
      <p className="mt-1 text-xs text-slate-500">Save scheduled copies to private storage. Download them from backup history whenever needed.</p>
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><span className="text-xs font-medium">Enable scheduled backups</span><input type="checkbox" role="switch" checked={schedule.enabled} disabled={disabled} onChange={event => setSchedule({ ...schedule, enabled: event.target.checked })} className="h-4 w-4 accent-emerald-600"/></label>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-medium">Frequency<select value={schedule.frequency} disabled={disabled} onChange={event => setSchedule({ ...schedule, frequency: event.target.value })} className={input}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option></select></label>
        <label className="text-xs font-medium">Time of day (UTC)<input type="time" required value={schedule.timeUtc} disabled={disabled} onChange={event => setSchedule({ ...schedule, timeUtc: event.target.value })} className={input}/></label>
        <label className="text-xs font-medium">Keep last copies (1–1000)<input type="number" min={1} max={1000} required value={schedule.retention} disabled={disabled} onChange={event => setSchedule({ ...schedule, retention: Number(event.target.value) })} className={input}/></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{schedule.nextRunAt ? `Next due: ${date(schedule.nextRunAt)} (${timezone})` : "No automatic backup scheduled."}</p><button disabled={disabled} className={button}>{busy === "schedule" ? "Saving…" : "Save schedule"}</button></div>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">Automatic backups run while the server scheduler is active. Retention is applied after successful scheduled backups; recovery copies are kept until you delete them.</p>
    </form>
    <section className={`${card} flex flex-wrap items-center justify-between gap-4`}><div><h2 className="flex items-center gap-2 text-sm font-semibold"><DatabaseBackup size={17} className="text-orange-600"/>Backup now</h2><p className="mt-1 text-xs text-slate-500">Create a complete snapshot in private storage.</p><label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={downloadNow} disabled={disabled} onChange={event => setDownloadNow(event.target.checked)} className="accent-neutral-900"/>Also download the JSON file to my computer</label><p className="mt-1 text-[11px] text-slate-400">Your browser saves to Downloads or asks you where to save.</p></div><button type="button" onClick={backup} disabled={disabled} className={button}><DatabaseBackup size={14}/>{busy === "backup" ? "Creating backup…" : "Backup now"}</button></section>
    <form onSubmit={restore} className={card}>
      <h2 className="flex items-center gap-2 text-sm font-semibold"><RotateCcw size={17} className="text-rose-500"/>Restore from backup</h2><p className="mt-1 text-xs text-slate-500">Upload a JSON backup to replace the entire application’s data.</p>
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"><AlertTriangle size={16} className="mt-0.5 shrink-0"/><p>Everything added since the backup will be replaced. A recovery copy is created first. All users will need to sign in again with credentials from the backup. Backup history and schedules are retained.</p></div>
      <label className="mt-4 block text-xs font-medium">JSON backup file<input type="file" accept=".json,application/json" disabled={disabled} onChange={event => void chooseFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"/></label>
      {preview && <p className="mt-2 text-xs text-slate-500">{preview}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">Your current owner password<input type="password" autoComplete="current-password" required value={password} disabled={disabled} onChange={event => setPassword(event.target.value)} className={input}/></label><label className="text-xs font-medium">Type RESTORE to confirm replacement<input value={confirmation} required pattern="RESTORE" autoComplete="off" disabled={disabled} onChange={event => setConfirmation(event.target.value)} className={input}/></label></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-xs text-slate-500">{progress || "Only restore a backup you trust. Server validation runs before replacement."}</p><button disabled={disabled || !file || confirmation !== "RESTORE" || !password} className={`${button} bg-rose-600`}><RotateCcw size={14}/>{busy === "restore" ? "Restoring…" : "Restore backup"}</button></div>
    </form>
    <section className={card}><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Backup history</h2><p className="mt-1 text-xs text-slate-500">The latest 100 backup attempts, most recent first. Stored privately on the server.</p></div><button type="button" aria-label="Refresh backup history" disabled={disabled} onClick={async () => { begin("refresh"); try { await refresh(); } catch { setError("Unable to refresh backup history."); } finally { setBusy(""); } }} className="rounded-lg border border-slate-200 p-2 disabled:opacity-50"><RefreshCw size={15}/></button></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="pb-3 font-medium">Scope / type</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Stored size</th><th className="pb-3 font-medium">Contents</th><th className="pb-3 font-medium">Started</th><th className="pb-3 text-right font-medium">Actions</th></tr></thead><tbody>{history.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-400">No backups yet. Create your first backup above.</td></tr> : history.map(archive => <tr key={archive.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-3"><span className="block font-medium">Entire application</span><span className="mt-1 block text-[10px] capitalize text-slate-400">{archive.kind.toLowerCase()}{archive.kind === "RECOVERY" ? " · before restore" : ""}</span></td><td className="py-4 pr-3"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${archive.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : archive.status === "FAILED" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}>{archive.status.toLowerCase()}</span>{archive.error && <p className="mt-2 max-w-48 text-[10px] text-rose-600">{archive.error}</p>}</td><td className="py-4 pr-3 text-slate-500">{size(archive.sizeBytes)}</td><td className="py-4 pr-3 text-slate-500">{archive.recordCount === null ? "—" : `${archive.recordCount.toLocaleString("en-IN")} records`}<small className="mt-1 block">{archive.fileCount === null ? "" : `${archive.fileCount} files`}</small></td><td className="py-4 pr-3 text-slate-500">{date(archive.createdAt)}</td><td className="py-4"><div className="flex justify-end gap-2">{archive.status === "COMPLETED" && !disabled && <a href={`/api/v1/backups/${archive.id}/download`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-[10px]"><Download size={12}/>Download</a>}<button type="button" disabled={disabled || archive.status === "RUNNING"} onClick={() => void remove(archive)} className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1.5 text-[10px] text-rose-600 disabled:opacity-40"><Trash2 size={12}/>Delete</button></div></td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
