"use client";
import { DOCUMENT_MIMES, DOCUMENT_ACCEPT, documentUploadMime } from "@core/features/documents/formats";
import { uploadPrivateFile } from "@/lib/private-upload";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FileActions } from "./file-actions";
import { EmployeeDocumentArchives, archiveFile } from "./employee-document-archives";
import type { ArchiveDocument } from "@core/features/documents/archive";

const visibilityLabels:Record<string,string>={SELF:"Employee, HR and Owner",HR:"HR and Owner",OWNER:"Owner only"};

const categories=["General","Identity","NDA","Offer letter","Appointment letter","Employment contract","Resume / CV","Certificate","Document archive","Experience letter","Relieving letter","Recommendation letter","Payslip"];
function CategoryPicker({defaultValue="General",name,onChange,disabled=false}:{defaultValue?:string;name?:string;onChange?:(value:string)=>void;disabled?:boolean}){
 const [value,setValue]=useState(defaultValue);
 const custom=!categories.includes(value);
 const update=(next:string)=>{setValue(next);onChange?.(next);};
 return <><select aria-label="Document category" name={custom?undefined:name} value={custom?"OTHER":value} disabled={disabled} onChange={event=>update(event.target.value==="OTHER"?"":event.target.value)} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{categories.map(category=><option key={category} value={category}>{category}</option>)}<option value="OTHER">Other / custom category</option></select>{custom&&<input aria-label="Custom document category" name={name} value={value} required minLength={2} maxLength={80} disabled={disabled} onChange={event=>update(event.target.value)} placeholder="Enter category" className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/>}</>;
}
type QueuedDocument={id:string;file:File;name:string;category:string;visibility:string;expiresAt?:string|null};
function normalizedDocumentFile(file:File){const type=documentUploadMime(file.name,file.type);return type===file.type?file:new File([file],file.name,{type,lastModified:file.lastModified});}
function fileExtension(name:string){const dot=name.lastIndexOf(".");return dot>0?name.slice(dot):"";}

type Version={id:string;version:number;createdAt:string;file:{id:string;originalFilename:string;mimeType:string;sizeBytes:number;scanStatus:string}};
type EmployeeDocument={id:string;category:string;visibility:string;expiresAt:string|null;currentFile:{id:string;originalFilename:string;mimeType:string;sizeBytes:number;scanStatus:string};versions:Version[]};

export function EmployeeDocuments({employeeId,canUpload,canSetVisibility,owner,hr,isSelf}:{employeeId:string;canUpload:boolean;canSetVisibility:boolean;owner:boolean;hr:boolean;isSelf:boolean}){
 const errorRef=useRef<HTMLParagraphElement>(null);
 const [queue,setQueue]=useState<QueuedDocument[]>([]);
 const [defaultCategory,setDefaultCategory]=useState("General");
 const [defaultVisibility,setDefaultVisibility]=useState("SELF");
 const [uploadProgress,setUploadProgress]=useState("");
 const [items,setItems]=useState<EmployeeDocument[]>([]);const [error,setError]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [selected,setSelected]=useState<Record<string,File|null>>({});const [history,setHistory]=useState<Record<string,Version[]|null>>({});const [editing,setEditing]=useState("");
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 async function refresh(){try{const response=await fetch(`/api/v1/employees/${employeeId}/documents`);const body=await response.json().catch(()=>null);if(response.ok)setItems(body?.data?.items??[]);else setError(body?.error?.message??"Unable to load documents.");}catch{setError("Unable to load documents.");}}
 useEffect(()=>{let active=true;fetch(`/api/v1/employees/${employeeId}/documents`).then(async response=>{const body=await response.json();if(!active)return;if(response.ok)setItems(body.data.items);else setError(body.error?.message??"Unable to load documents.");}).catch(()=>{if(active)setError("Unable to load documents.");});return()=>{active=false;};},[employeeId]);
 async function stageFile(file:File,purpose:"EMPLOYEE_DOCUMENT"|"DOCUMENT_VERSION",target:string){file=normalizedDocumentFile(file);const init=await fetch("/api/v1/files/upload-init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({purpose,...(purpose==="EMPLOYEE_DOCUMENT"?{employeeId}:{documentId:target}),originalFilename:file.name,mimeType:file.type,sizeBytes:file.size})});const initBody=await init.json();if(!init.ok)throw new Error(initBody.error?.message??"Unable to initialize the upload.");const sent=await uploadPrivateFile(initBody.data.uploadUrl,initBody.data,file);if(!sent.ok)throw new Error("The file could not be uploaded to private storage.");const complete=await fetch("/api/v1/files/upload-complete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileId:initBody.data.fileId})});const completeBody=await complete.json();if(!complete.ok)throw new Error(completeBody.error?.message??"The file did not pass verification.");return completeBody.data.fileId as string;}
 async function createDocument(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  const form=event.currentTarget;
  const input=form.elements.namedItem("file") as HTMLInputElement;
  const batch=[...queue];
  const files=batch.map(item=>item.file);
  const values=Object.fromEntries(new FormData(form));
  setError("");setMessage("");
  if(!files.length){setError("Choose one or more files to upload.");return;}
  const invalid=files.find(file=>!file.size||file.size>10*1024*1024||!DOCUMENT_MIMES.some(type=>type===file.type));
  if(invalid){setError(invalid.name+": choose a PDF, Word (.docx), JPEG, PNG, or WebP file up to 10 MB.");return;}
  const invalidDetails=batch.find(item=>item.category.trim().length<2||item.category.trim().length>80||!item.name.trim()||item.name.trim().length+fileExtension(item.file.name).length>180||/[\u0000-\u001f\u007f/\\]/.test(item.name));
  if(invalidDetails){setError("Check the name and category for "+invalidDetails.file.name+".");return;}
  setBusy(true);
  let saved=0;
  const failed:QueuedDocument[]=[];
  const failures:string[]=[];
  try{
   for(const [index,item] of batch.entries()){
    const file=new File([item.file],item.name.trim()+fileExtension(item.file.name),{type:item.file.type,lastModified:item.file.lastModified});
    setUploadProgress("Uploading "+(index+1)+" of "+files.length+": "+file.name);
    try{
     const fileId=await stageFile(file,"EMPLOYEE_DOCUMENT",employeeId);
     const response=await fetch(`/api/v1/employees/${employeeId}/documents`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileId,category:item.category.trim(),visibility:canSetVisibility?item.visibility:"SELF",...((item.expiresAt!==undefined?item.expiresAt:values.expiresAt)?{expiresAt:item.expiresAt!==undefined?item.expiresAt:values.expiresAt}:{})})});
     const body=await response.json();
     if(!response.ok)throw new Error(body.error?.message??"Could not save the document.");
     saved++;
    }catch(error){failed.push(item);failures.push(file.name+": "+(error instanceof Error?error.message:"Upload failed."));}
   }
   if(saved)setMessage(saved+" document"+(saved===1?"":"s")+" uploaded and saved.");
   if(failures.length)setError(failures.join(" ")+" Failed files remain below so you can retry them.");
   input.value="";setQueue(failed);
   await refresh();
  }finally{setUploadProgress("");setBusy(false);}
 }
 function importArchive(documents:ArchiveDocument[]){
  const added=documents.map(document=>{
   const file=archiveFile(document);
   const requested=document.metadata?.visibility??defaultVisibility;
   const visibility=requested==="OWNER"?(owner?"OWNER":canSetVisibility?"HR":"SELF"):requested==="HR"?(canSetVisibility?"HR":"SELF"):"SELF";
   return {id:crypto.randomUUID(),file,name:file.name.slice(0,file.name.length-fileExtension(file.name).length),category:document.metadata?.category??defaultCategory,visibility,expiresAt:document.metadata?.expiresAt};
  });
  setQueue(current=>[...current,...added]);setError("");setMessage(added.length+" files unzipped. Review their names, categories, and visibility, then upload.");
 }
 async function saveArchive(file:File,visibility:string){
  if(busy)throw new Error("Wait for the current upload to finish.");
  setBusy(true);setError("");setMessage("");
  try{
   const fileId=await stageFile(file,"EMPLOYEE_DOCUMENT",employeeId);
   const response=await fetch(`/api/v1/employees/${employeeId}/documents`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileId,category:"Document archive",visibility})});
   const body=await response.json().catch(()=>null);
   if(!response.ok)throw new Error(body?.error?.message??"Unable to save ZIP.");
   setMessage("ZIP saved. Open it from Employee documents below. Original documents remain available.");await refresh();
  }finally{setBusy(false);}
 }
 async function addVersion(documentId:string){const file=selected[documentId];if(!file)return setError("Choose a replacement file first.");setBusy(true);setError("");try{const fileId=await stageFile(file,"DOCUMENT_VERSION",documentId);const response=await fetch(`/api/v1/documents/${documentId}/versions`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fileId})});const body=await response.json();if(!response.ok)throw new Error(body.error?.message??"Could not save the new version.");setSelected(current=>({...current,[documentId]:null}));setMessage("New document version saved.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}}
 async function showVersions(documentId:string){setError("");try{const response=await fetch(`/api/v1/documents/${documentId}/versions`);const body=await response.json().catch(()=>null);if(!response.ok){setError(body?.error?.message??"Unable to load versions.");return;}setHistory(current=>({...current,[documentId]:body?.data?.items??[]}));}catch{setError("Unable to load versions. Check your connection and try again.");}}
 async function remove(documentId:string){if(busy||!window.confirm("Delete this document and its stored versions?"))return;setBusy(true);setError("");setMessage("");try{const response=await fetch(`/api/v1/documents/${documentId}`,{method:"DELETE"});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error?.message??"Unable to delete document.");setMessage("Document and stored versions deleted.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to delete document.");}finally{setBusy(false);}}
 async function updateMetadata(event:FormEvent<HTMLFormElement>,documentId:string){event.preventDefault();if(busy)return;const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));setBusy(true);setError("");setMessage("");try{const response=await fetch(`/api/v1/documents/${documentId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({category:values.category,expiresAt:values.expiresAt||null,...(owner?{visibility:values.visibility}:{})})});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error?.message??"Unable to update document.");setEditing("");setMessage("Document details updated.");await refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to update document.");}finally{setBusy(false);}}
 return <div className="space-y-5">{error&&<p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
 <EmployeeDocumentArchives items={items} disabled={busy} canUpload={canUpload} onImport={importArchive} onSave={saveArchive}/>
 {canUpload&&<form onSubmit={createDocument} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
  <div className="grid gap-4 md:grid-cols-2">
   <label className="text-xs font-semibold">Default category<CategoryPicker onChange={setDefaultCategory} disabled={busy}/><span className="mt-1 block font-normal text-slate-500">Used for files you select next. Change each file below if needed.</span></label>
   <label className="text-xs font-semibold">Default visibility<select disabled={busy||!canSetVisibility} value={defaultVisibility} onChange={event=>setDefaultVisibility(event.target.value)} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="SELF">Employee, HR and Owner</option>{canSetVisibility&&<option value="HR">HR and Owner</option>}{owner&&<option value="OWNER">Owner only</option>}</select></label>
   <label className="text-xs font-semibold">Expiry date (optional)<input name="expiresAt" type="date" disabled={busy} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>
   <label className="text-xs font-semibold">Files (PDF, Word DOCX, JPEG, PNG, WebP - up to 10 MB each)<input name="file" type="file" multiple disabled={busy} accept={DOCUMENT_ACCEPT} onChange={event=>{
    const added=Array.from(event.target.files??[]).map(normalizedDocumentFile).map(file=>({id:crypto.randomUUID(),file,name:file.name.slice(0,file.name.length-fileExtension(file.name).length),category:defaultCategory,visibility:canSetVisibility?defaultVisibility:"SELF"}));
    setQueue(current=>[...current,...added.filter(item=>!current.some(existing=>existing.file.name===item.file.name&&existing.file.size===item.file.size&&existing.file.lastModified===item.file.lastModified))]);
    event.target.value="";setError("");
   }} className="mt-2 block w-full text-xs"/></label>
  </div>
  {queue.length>0&&<div className="space-y-3"><p className="text-xs text-slate-500">Set a name, category, and visibility for each file. The expiry date applies to the whole batch.</p>{queue.map(item=><div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
   <label className="min-w-0 text-xs font-semibold">File name<div className="mt-2 flex items-center gap-2"><input aria-label={"File name for "+item.file.name} value={item.name} required maxLength={180-fileExtension(item.file.name).length} disabled={busy} onChange={event=>setQueue(current=>current.map(row=>row.id===item.id?{...row,name:event.target.value}:row))} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"/><span className="text-slate-500">{fileExtension(item.file.name)}</span></div><span className="mt-1 block break-all font-normal text-slate-500">Original: {item.file.name} ({(item.file.size/1024/1024).toFixed(2)} MB)</span></label>
   <label className="text-xs font-semibold">Category<CategoryPicker defaultValue={item.category} disabled={busy} onChange={category=>setQueue(current=>current.map(row=>row.id===item.id?{...row,category}:row))}/></label>
   <label className="text-xs font-semibold">Visibility<select aria-label={"Visibility for "+item.file.name} value={item.visibility} disabled={busy||!canSetVisibility} onChange={event=>setQueue(current=>current.map(row=>row.id===item.id?{...row,visibility:event.target.value}:row))} className="mt-2 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="SELF">Employee, HR and Owner</option>{canSetVisibility&&<option value="HR">HR and Owner</option>}{owner&&<option value="OWNER">Owner only</option>}</select></label>
   <button type="button" disabled={busy} aria-label={"Remove "+item.file.name} onClick={()=>setQueue(current=>current.filter(row=>row.id!==item.id))} className="self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50 md:mt-6">Remove</button>
  </div>)}</div>}
  {uploadProgress&&<p role="status" className="text-xs text-slate-600">{uploadProgress}</p>}
  <button disabled={busy||!queue.length} className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy?"Uploading...":queue.length>1?"Upload "+queue.length+" documents":"Upload document"}</button>
 </form>}

 <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Employee documents</h2></div>{items.length?items.map(document=>{const canManageThis=owner||(hr&&document.visibility!=="OWNER")||(isSelf&&document.visibility==="SELF");return <article key={document.id} className="border-b border-slate-100 p-5 last:border-0"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold">{document.category}<span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{visibilityLabels[document.visibility]??document.visibility}</span></p><p className="mt-1 text-xs text-slate-500">{document.currentFile.originalFilename} · {(document.currentFile.sizeBytes/1024/1024).toFixed(2)} MB · {document.versions.length} version(s)</p><p className="mt-1 text-[11px] text-slate-400">{document.expiresAt?`Expires ${new Date(document.expiresAt).toLocaleDateString()}`:"No expiry date"}</p></div><div className="flex flex-wrap gap-2"><FileActions fileId={document.currentFile.id} filename={document.currentFile.originalFilename} onExtract={canUpload?importArchive:undefined}/><button onClick={()=>showVersions(document.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold">Version history</button>{canManageThis&&<button onClick={()=>setEditing(editing===document.id?"":document.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold">Edit details</button>}{canManageThis&&<button disabled={busy} onClick={()=>remove(document.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-600">Delete</button>}</div></div>
 {canManageThis&&editing===document.id&&<form onSubmit={event=>updateMetadata(event,document.id)} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-3"><label className="text-[11px] font-semibold">Category<CategoryPicker key={document.id+document.category} name="category" defaultValue={document.category} disabled={busy}/></label><label className="text-[11px] font-semibold">Expiry date<input name="expiresAt" type="date" defaultValue={document.expiresAt?.slice(0,10)??""} className="mt-2 block h-9 w-full rounded-lg border border-slate-200 px-3 text-xs"/></label>{owner&&<label className="text-[11px] font-semibold">Visibility<select name="visibility" defaultValue={document.visibility} className="mt-2 block h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"><option value="SELF">Employee, HR and Owner</option><option value="HR">HR and Owner</option><option value="OWNER">Owner only</option></select></label>}<div className="md:col-span-3 flex gap-2"><button disabled={busy} className="rounded-lg bg-[#f46327] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Save details"}</button><button type="button" onClick={()=>setEditing("")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px]">Cancel</button></div></form>}
 {canManageThis&&<div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" aria-label={`Select a new version for ${document.category}`} accept={DOCUMENT_ACCEPT} onChange={event=>setSelected(current=>({...current,[document.id]:event.target.files?.[0]??null}))} className="max-w-full text-[11px]"/><button disabled={busy||!selected[document.id]} onClick={()=>addVersion(document.id)} className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-40">Upload new version</button></div>}
 {history[document.id]&&<div className="mt-4 rounded-lg bg-slate-50 p-3">{history[document.id]!.map(version=><div key={version.id} className="flex items-center justify-between gap-3 border-b border-white py-2 last:border-0"><span className="text-xs">Version {version.version} · {version.file.originalFilename} · {new Date(version.createdAt).toLocaleDateString()}</span><FileActions fileId={version.file.id} filename={version.file.originalFilename} onExtract={canUpload?importArchive:undefined}/></div>)}</div>}</article>;}):<p className="px-5 py-12 text-center text-xs text-slate-400">No documents have been added.</p>}</section></div>;
}
