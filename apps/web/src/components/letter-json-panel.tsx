"use client";

import { useState } from "react";
import type { LetterContent } from "@core/features/letters/content";
import { exportLetterJson, parseLetterJson, sampleLetterJson } from "@core/features/letters/json";
import { LETTER_LIMITS } from "@core/features/letters/limits";

export function LetterJsonPanel({ content, disabled, templateName, onImport }: { content: LetterContent; disabled: boolean; templateName: string; onImport: (content: LetterContent, templateName?: string) => void }) {
  const [source, setSource] = useState(""), [error, setError] = useState(""), [message, setMessage] = useState("");
  const button = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50";
  async function copy(text: string) {
    setError(""); setMessage("");
    try { await navigator.clipboard.writeText(text); setMessage("JSON copied. It includes the document layout and all current limits."); }
    catch { setSource(text); setMessage("Clipboard access is unavailable. Select and copy the JSON below."); }
  }
  function importText(text: string) {
    setError(""); setMessage("");
    try {
      const result = parseLetterJson(text, content); onImport(result.content, result.templateName);
      setMessage("JSON loaded into the editor. Review it, then save the document or custom template.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to import this JSON."); }
  }
  return <section aria-label="JSON document import and export" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
    <div><h2 className="font-semibold">Import or copy document JSON</h2><p className="mt-1 text-xs leading-5 text-slate-500">Paste JSON from another tool or upload a .json file. Copy sample JSON to get the format, current page sizes, margins, blocks, signatures, and application limits. A content-only JSON object can update text while keeping the current letterhead.</p></div>
    <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => copy(sampleLetterJson(content))}>Copy sample JSON</button><button type="button" className={button} onClick={() => copy(exportLetterJson(content, templateName))}>Copy current JSON</button><button type="button" className={button} onClick={() => {
      const file = new File([exportLetterJson(content, templateName)], "letter-document.json", { type: "application/json" });
      const url = URL.createObjectURL(file), link = document.createElement("a"); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    }}>Download JSON</button><label className={`relative ${button}`}>Upload JSON file<input className="sr-only" disabled={disabled} type="file" accept=".json,application/json" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
      if (file.size > LETTER_LIMITS.uploads.requestJsonCharacters) { setError("Use a JSON file smaller than 8.5 MB."); return; }
      try { const text = await file.text(); setSource(text); importText(text); } catch { setError("Unable to read this JSON file."); }
    }}/></label></div>
    <details><summary className="cursor-pointer text-xs font-semibold">Paste or edit JSON</summary><label className="mt-3 block text-xs font-semibold">Document JSON<textarea disabled={disabled} rows={9} value={source} spellCheck={false} onChange={event => setSource(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-normal"/></label><button type="button" disabled={disabled || !source.trim()} className={`${button} mt-3`} onClick={() => importText(source)}>Load JSON into editor</button></details>
    {error && <p role="alert" className="break-words rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
  </section>;
}
