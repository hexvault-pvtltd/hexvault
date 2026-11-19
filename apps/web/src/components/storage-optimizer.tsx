"use client";

import { useEffect, useRef, useState } from "react";
import { HardDrive, Minimize2 } from "lucide-react";

type Batch = { processed: number; changed: number; originalBytes: number; storedBytes: number; errors: string[]; nextCursor: string | null; nextPhase: "FILES" | "BACKUPS"; done: boolean };
type Totals = { processed: number; changed: number; originalBytes: number; storedBytes: number; errors: number };
const empty: Totals = { processed: 0, changed: 0, originalBytes: 0, storedBytes: 0, errors: 0 };
const size = (value: number) => `${(value / 1024 / 1024).toLocaleString("en-IN", { maximumFractionDigits: 2 })} MB`;
export function StorageOptimizer() {
  const [busy, setBusy] = useState(false);
  const [totals, setTotals] = useState(empty);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);
  async function optimize() {
    if (busy) return;
    stop.current = false; setBusy(true); setError(""); setTotals(empty);
    let total = { ...empty }, cursor: string | null = null, phase: "FILES" | "BACKUPS" = "FILES";
    try {
      while (!stop.current) {
        setMessage(phase === "FILES" ? "Optimizing stored files… Keep this page open." : "Optimizing backup snapshots… Keep this page open.");
        const response = await fetch("/api/v1/storage/optimize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cursor, phase }) });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message ?? "Optimization could not complete. You can retry safely.");
        const batch = body.data as Batch;
        total = { processed: total.processed + batch.processed, changed: total.changed + batch.changed, originalBytes: total.originalBytes + batch.originalBytes, storedBytes: total.storedBytes + batch.storedBytes, errors: total.errors + batch.errors.length };
        setTotals(total);
        if (batch.done) { setMessage(`Optimization complete. ${total.processed} files and backups checked.${total.errors ? ` ${total.errors} could not be processed; retry after checking storage availability.` : ""}`); break; }
        cursor = batch.nextCursor; phase = batch.nextPhase;
      }
      if (stop.current) setMessage("Optimization stopped after the current batch. You can run it again safely.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to optimize storage."); setMessage(""); }
    finally { setBusy(false); }
  }
  const saved = Math.max(0, totals.originalBytes - totals.storedBytes);
  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="flex items-center gap-2 text-sm font-semibold"><HardDrive size={18}/>Automatic storage compression</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">New uploaded files and JSON backups are compressed automatically when it reduces storage. Documents, images, and attachments keep their exact original bytes. Preview and download work without extracting anything yourself.</p><p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">Some formats are already compressed and may stay the same size. Audio and video stay in their original format for reliable playback and seeking. PDFs, images, audio, video, and text can be previewed where supported by your browser. Other formats remain downloadable.</p></section>
    <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="flex items-center gap-2 text-sm font-semibold"><Minimize2 size={18}/>Optimize existing files and backups</h2><p className="mt-2 text-sm leading-6 text-slate-500">Apply lossless compression to files uploaded before this update. File links, permissions, and original downloads are preserved. Files are processed in small batches.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={optimize} className="rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Optimizing…" : "Optimize existing storage"}</button>{busy && <button type="button" onClick={() => { stop.current = true; setMessage("Stopping after the current batch…"); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Stop after this batch</button>}</div>{message && <p role="status" className="mt-4 text-sm text-slate-600">{message}</p>}{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}</section>
    <section aria-label="Latest optimization results" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Checked this run", `${totals.processed} files / backups`], ["Original size", size(totals.originalBytes)], ["Stored size", size(totals.storedBytes)], ["Storage saved", `${size(saved)}${totals.originalBytes ? ` (${Math.round(saved / totals.originalBytes * 100)}%)` : ""}`]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-400">{label}</p><p className="mt-3 text-lg font-semibold">{value}</p></div>)}</section>
    <p className="text-xs text-slate-400">These results cover this run only. Application records remain in the database; backup snapshots of those records are compressed in private storage.</p>
  </div>;
}
