"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createDocumentArchive, readDocumentArchive, archiveVisibility, MAX_ARCHIVE_BYTES, type ArchiveDocument } from "@core/features/documents/archive";

const button="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50";
export type ArchiveImport=(documents:ArchiveDocument[])=>void;
export function archiveFile(document:ArchiveDocument) {
  return new File([new Uint8Array(document.bytes).buffer],document.filename,{type:document.mimeType});
}
function saveBlob(blob:Blob,filename:string) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30_000);
}
async function loadPrivateFile(fileId:string) {
  const response=await fetch(`/api/v1/files/${fileId}/download?download=1`,{cache:"no-store"});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body?.data?.url)throw new Error(body?.error?.message??"Unable to access this document.");
  if(body.data.sizeBytes>MAX_ARCHIVE_BYTES)throw new Error("This file exceeds the 100 MB archive limit.");
  const file=await fetch(body.data.url);
  if(!file.ok)throw new Error("Unable to read private storage. Check your connection and storage CORS settings.");
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length!==body.data.sizeBytes)throw new Error("The downloaded document is incomplete.");
  return bytes;
}

function ArchiveViewer({documents,name,onClose,onImport}:{documents:ArchiveDocument[];name:string;onClose:()=>void;onImport?:ArchiveImport}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [selected,setSelected]=useState(()=>new Set(documents.map(document=>document.path)));
  const [preview,setPreview]=useState<{url:string;name:string;mimeType:string}|null>(null);
  useEffect(()=>{const node=dialog.current;node?.showModal();return()=>node?.close();},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url);},[preview]);
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label="ZIP contents" className="fixed inset-0 m-auto max-h-[90dvh] w-[min(100%-2rem,1000px)] overflow-auto rounded-xl bg-white p-5 shadow-xl backdrop:bg-black/50">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="break-all text-base font-semibold">{name}</h2><p className="mt-1 text-xs text-slate-500">{documents.length} documents. Preview or download individual files without extracting them to your computer.</p></div><button type="button" onClick={onClose} className={button}>Close</button></div>
    <div className="mt-4 divide-y divide-slate-100">{documents.map(document=><div key={document.path} className="flex flex-wrap items-center gap-3 py-3">
      {onImport&&<input type="checkbox" aria-label={"Select "+document.filename} checked={selected.has(document.path)} onChange={event=>setSelected(current=>{const next=new Set(current);if(event.target.checked)next.add(document.path);else next.delete(document.path);return next;})}/>}
      <div className="min-w-0 flex-1"><p className="break-all text-xs font-semibold">{document.filename}</p><p className="mt-1 text-xs text-slate-500">{(document.bytes.length/1024/1024).toFixed(2)} MB{document.metadata?` / ${document.metadata.category}`:""}</p></div>
      <button type="button" onClick={()=>setPreview({url:URL.createObjectURL(archiveFile(document)),name:document.filename,mimeType:document.mimeType})} className={button}>Preview</button>
      <button type="button" onClick={()=>saveBlob(archiveFile(document),document.filename)} className={button}>Download</button>
    </div>)}</div>
    {onImport&&<button type="button" disabled={!selected.size} onClick={()=>{onImport(documents.filter(document=>selected.has(document.path)));onClose();}} className={button+" mt-4"}>Unzip {selected.size} selected to upload form</button>}
    {preview&&<section className="mt-5 rounded-lg border border-slate-200 p-3"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="break-all text-sm font-semibold">{preview.name}</h3><button type="button" onClick={()=>setPreview(null)} className={button}>Close preview</button></div>{preview.mimeType.startsWith("image/")?<Image src={preview.url} alt={preview.name} width={1200} height={900} unoptimized className="max-h-[60dvh] w-auto max-w-full object-contain"/>:<iframe title={"Preview "+preview.name} src={preview.url} className="h-[60dvh] w-full border-0"/>}</section>}
  </dialog>;
}

export function StoredArchiveActions({fileId,filename,onImport}:{fileId:string;filename:string;onImport?:ArchiveImport}) {
  const [documents,setDocuments]=useState<ArchiveDocument[]|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function open(download=false) {
    setBusy(true);setError("");
    try{const bytes=await loadPrivateFile(fileId);if(download)saveBlob(new Blob([new Uint8Array(bytes).buffer],{type:"application/zip"}),filename);else setDocuments(await readDocumentArchive(bytes));}
    catch(error){setError(error instanceof Error?error.message:"Unable to open ZIP.");}
    finally{setBusy(false);}
  }
  return <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>open()} className={button}>Open / unzip</button><button type="button" disabled={busy} onClick={()=>open(true)} className={button}>Download ZIP</button>{error&&<p role="alert" className="w-full text-xs text-rose-600">{error}</p>}{documents&&<ArchiveViewer documents={documents} name={filename} onClose={()=>setDocuments(null)} onImport={onImport}/>}</div>;
}

type DocumentRecord={category:string;visibility:string;expiresAt:string|null;currentFile:{id:string;originalFilename:string;mimeType:string;sizeBytes:number;scanStatus:string}};
export function EmployeeDocumentArchives({items,disabled,canUpload,onImport,onSave}:{items:DocumentRecord[];disabled:boolean;canUpload:boolean;onImport:ArchiveImport;onSave:(file:File,visibility:string)=>Promise<void>}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [opened,setOpened]=useState<{documents:ArchiveDocument[];name:string}|null>(null);
  const available=items.filter(item=>item.currentFile.mimeType!=="application/zip"&&item.currentFile.scanStatus==="CLEAN");
  async function build(saveInside:boolean) {
    setBusy(true);setError("");
    try{
      if(!available.length||available.length>100)throw new Error("A ZIP can contain 1 to 100 current documents.");
      if(available.reduce((total,item)=>total+item.currentFile.sizeBytes,0)>MAX_ARCHIVE_BYTES)throw new Error("The documents exceed 100 MB. Download them individually or use a smaller collection.");
      const records=[];
      for(const item of available)records.push({filename:item.currentFile.originalFilename,bytes:await loadPrivateFile(item.currentFile.id),category:item.category,visibility:item.visibility as "SELF"|"HR"|"OWNER",expiresAt:item.expiresAt});
      const bytes=await createDocumentArchive(records);
      const file=new File([new Uint8Array(bytes).buffer],`employee-documents-${new Date().toISOString().slice(0,10)}.zip`,{type:"application/zip"});
      if(saveInside){
        if(file.size>10*1024*1024)throw new Error("This ZIP exceeds the 10 MB saved-file limit. Use Download ZIP to save it to your computer.");
        const visibility=archiveVisibility(records.map(item=>item.visibility));
        await onSave(file,visibility);
      }else saveBlob(file,file.name);
    }catch(error){setError(error instanceof Error?error.message:"Unable to create ZIP.");}finally{setBusy(false);}
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">ZIP documents</h2><p className="text-xs leading-5 text-slate-500">Download the latest versions you can access as one ZIP, or open a ZIP to preview and unzip its files. Names, categories, visibility, and expiry dates are included in HEXVAULT exports. ZIP copies keep originals available. Stored documents already use lossless compression when it saves space.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={disabled||busy||!available.length} onClick={()=>build(false)} className={button}>Download documents ZIP</button>{canUpload&&<button type="button" disabled={disabled||busy||!available.length} onClick={()=>build(true)} className={button}>Save ZIP inside</button>}<label className={button+" cursor-pointer"}>Open ZIP / unzip<input type="file" accept=".zip,application/zip" disabled={disabled||busy} className="sr-only" onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;setBusy(true);setError("");try{if(file.size>MAX_ARCHIVE_BYTES)throw new Error("ZIP files must be no larger than 100 MB.");setOpened({name:file.name,documents:await readDocumentArchive(new Uint8Array(await file.arrayBuffer()))});}catch(error){setError(error instanceof Error?error.message:"Unable to open ZIP.");}finally{setBusy(false);}}}/></label></div>{busy&&<p role="status" className="text-xs text-slate-500">Preparing documents...</p>}{error&&<p role="alert" className="text-xs text-rose-600">{error}</p>}<p className="text-[11px] text-slate-400">ZIP limits: 100 documents, 10 MB each, 100 MB extracted total. Saved ZIPs must be under 10 MB. History versions remain available individually.</p>{opened&&<ArchiveViewer documents={opened.documents} name={opened.name} onClose={()=>setOpened(null)} onImport={canUpload?onImport:undefined}/>}</section>;
}
