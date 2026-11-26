"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, Eye, X } from "lucide-react";
import { StoredArchiveActions, type ArchiveImport } from "./employee-document-archives";

type Preview = { url: string; previewable: boolean; filename: string; mimeType: string; sizeBytes: number };
async function fileUrl(fileId: string, preview: boolean): Promise<Preview> {
  const response = await fetch(`/api/v1/files/${fileId}/download?${preview ? "preview=1" : "download=1"}`, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.data?.url) throw new Error(body?.error?.message ?? "Unable to open this file.");
  return body.data;
}
function saveUrl(url: string) {
  const link = document.createElement("a");
  link.href = url; link.rel = "noreferrer";
  document.body.appendChild(link); link.click(); link.remove();
}
function FilePreview({ fileId, filename, onClose }: { fileId: string; filename: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    let active = true;
    fileUrl(fileId, true).then(value => { if (active) setFile(value); }).catch(error => { if (active) setError(error instanceof Error ? error.message : "Preview unavailable."); });
    return () => { active = false; element?.close(); previous?.focus(); };
  }, [fileId]);
  async function download() {
    setBusy(true); setError("");
    try { saveUrl((await fileUrl(fileId, false)).url); }
    catch (error) { setError(error instanceof Error ? error.message : "Download unavailable."); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label={`Preview ${filename}`} className="m-auto w-[min(96vw,1100px)] max-w-none rounded-2xl border border-slate-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/50">
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{filename}</h2><p className="mt-1 text-[11px] text-slate-500">Original file · {file ? `${(file.sizeBytes / 1024).toLocaleString("en-IN", { maximumFractionDigits: 1 })} KB` : "Loading preview…"}</p></div><div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={download} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download size={14}/>{busy ? "Preparing…" : "Download"}</button><button autoFocus type="button" onClick={onClose} aria-label="Close file preview" className="rounded-lg border border-slate-200 p-2"><X size={17}/></button></div></header>
    {error && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    <div className="flex min-h-60 max-h-[75dvh] items-center justify-center overflow-auto bg-slate-50 p-3">
      {!file && !error && <p role="status" className="text-sm text-slate-500">Loading original file…</p>}
      {file && !file.previewable && <p className="max-w-md p-6 text-center text-sm leading-6 text-slate-500">This format cannot be previewed in the browser. Download the original file to open it in a compatible app.</p>}
      {file?.previewable && (file.mimeType.startsWith("image/") ? <Image src={file.url} alt={filename} width={1200} height={900} unoptimized className="max-h-[70dvh] w-auto max-w-full object-contain"/>
        : file.mimeType.startsWith("audio/") ? <audio src={file.url} controls preload="metadata" aria-label={filename} className="w-full max-w-xl"/>
        : file.mimeType.startsWith("video/") ? <video src={file.url} controls preload="metadata" aria-label={filename} className="max-h-[70dvh] max-w-full"><track kind="captions" label="Captions"/></video>
        : <iframe title={`Preview ${filename}`} src={file.url} referrerPolicy="no-referrer" className="h-[70dvh] w-full rounded-lg border-0 bg-white"/>)}
    </div>
  </dialog>;
}

export function FileActions({ fileId, filename, onExtract }: { fileId: string; filename: string; onExtract?: ArchiveImport }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try { saveUrl((await fileUrl(fileId, false)).url); }
    catch (error) { setError(error instanceof Error ? error.message : "Download unavailable."); }
    finally { setBusy(false); }
  }
  return filename.toLowerCase().endsWith(".zip") ? <StoredArchiveActions fileId={fileId} filename={filename} onImport={onExtract}/> : <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold"><Eye size={12}/>Preview</button><button type="button" disabled={busy} onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-50"><Download size={12}/>{busy ? "Preparing…" : "Download"}</button>{error && <p role="alert" className="w-full text-xs text-rose-600">{error}</p>}{open && <FilePreview fileId={fileId} filename={filename} onClose={() => setOpen(false)}/>}</div>;
}
