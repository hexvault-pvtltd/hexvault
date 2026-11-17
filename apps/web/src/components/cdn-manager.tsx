"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, FolderPlus, Globe2, LockKeyhole, Shield, Trash2, Upload, Users } from "lucide-react";

type Access = { canView: boolean; canUpload: boolean; canManage: boolean };
type Folder = { id: string; name: string; description: string | null; access: Access; _count?: { assets: number; grants: number } };
type Asset = { id: string; isPublic: boolean; createdAt: string; contentUrl: string; file: { id: string; originalFilename: string; mimeType: string; sizeBytes: number; checksum: string | null; createdAt: string } };
type Person = { id: string; email: string; employee: { fullName: string; employeeCode: string } };
type Grant = { id: string; canView: boolean; canUpload: boolean; canManage: boolean; user: Person };

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request could not be completed.");
  return body?.data;
}
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CdnManager({ initialFolders, people, owner, appUrl }: { initialFolders: Folder[]; people: Person[]; owner: boolean; appUrl: string }) {
  const [folders, setFolders] = useState(initialFolders);
  const [selectedId, setSelectedId] = useState(initialFolders[0]?.id ?? "");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [canUpload, setCanUpload] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialFolders[0]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = folders.find(folder => folder.id === selectedId);
  const mayManage = owner || Boolean(selected?.access.canManage);

  const refreshFolders = useCallback(async () => {
    const data = await requestJson("/api/v1/cdn/folders");
    setFolders(data.items);
    setSelectedId(current => data.items.some((folder: Folder) => folder.id === current) ? current : (data.items[0]?.id ?? ""));
  }, []);

  const refreshAssets = useCallback(async (folderId: string) => {
    if (!folderId) { setAssets([]); setGrants([]); return; }
    const [fileData, grantData] = await Promise.all([
      requestJson(`/api/v1/cdn/folders/${folderId}/assets`),
      owner ? requestJson(`/api/v1/cdn/folders/${folderId}/access`) : Promise.resolve({ items: [] }),
    ]);
    setAssets(fileData.items);
    setGrants(grantData.items);
  }, [owner]);

  useEffect(() => {
    let active = true;
    if (!selectedId) return;
    Promise.all([
      requestJson(`/api/v1/cdn/folders/${selectedId}/assets`),
      owner ? requestJson(`/api/v1/cdn/folders/${selectedId}/access`) : Promise.resolve({ items: [] }),
    ]).then(([assetData, grantData]) => {
      if (!active) return;
      setAssets(assetData.items); setGrants(grantData.items); setError("");
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load this folder."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner, selectedId]);

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const values = new FormData(form);
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await requestJson("/api/v1/cdn/folders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: values.get("name"), description: values.get("description") || null }) });
      await refreshFolders(); setLoading(true); setSelectedId(data.item.id); form.reset(); setMessage("CDN folder created.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create the folder."); }
    finally { setBusy(false); }
  }

  async function grantAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !selectedId || !selectedUser) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await requestJson(`/api/v1/cdn/folders/${selectedId}/access`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: selectedUser, canView: true, canUpload: canUpload || canManage, canManage }) });
      setSelectedUser(""); setCanUpload(false); setCanManage(false); await refreshAssets(selectedId); await refreshFolders(); setMessage("Folder access granted.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to grant access."); }
    finally { setBusy(false); }
  }

  async function revokeAccess(grantId: string) {
    if (busy || !selectedId || !window.confirm("Revoke this person’s CDN folder access?")) return;
    setBusy(true); setError(""); setMessage("");
    try { await requestJson(`/api/v1/cdn/folders/${selectedId}/access/${grantId}`, { method: "DELETE" }); await refreshAssets(selectedId); await refreshFolders(); setMessage("Folder access revoked."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to revoke access."); }
    finally { setBusy(false); }
  }

  async function uploadFiles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !selectedId) return;
    const form = event.currentTarget; const input = form.elements.namedItem("files") as HTMLInputElement; const files = Array.from(input.files ?? []);
    if (!files.length) { setError("Choose at least one file."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} exceeds the 50 MB limit.`);
        const init = await requestJson("/api/v1/cdn/uploads/init", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderId: selectedId, originalFilename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size }) });
        const formData = new FormData();
        for (const [key, value] of Object.entries(init.fields as Record<string, string>)) formData.append(key, value);
        formData.append("file", file);
        const sent = await fetch(init.uploadUrl, { method: "POST", body: formData });
        if (!sent.ok) throw new Error(`Storage rejected ${file.name}; check the storage CORS setup and try again.`);
        await requestJson("/api/v1/cdn/uploads/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileId: init.fileId }) });
      }
      form.reset(); await refreshAssets(selectedId); await refreshFolders(); setMessage(`${files.length} file${files.length === 1 ? "" : "s"} uploaded, scanned, and saved.`);
    } catch (reason) { await refreshAssets(selectedId).catch(() => {}); setError(reason instanceof Error ? reason.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function setPublic(asset: Asset) {
    const next = !asset.isPublic;
    if (!selectedId || busy || (next && !window.confirm("Anyone who has this link will be able to download this file. Make it public?"))) return;
    setBusy(true); setError(""); setMessage("");
    try { await requestJson(`/api/v1/cdn/assets/${asset.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isPublic: next }) }); await refreshAssets(selectedId); setMessage(next ? "Public link enabled." : "File is login-protected again."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update sharing."); }
    finally { setBusy(false); }
  }

  async function deleteAsset(asset: Asset) {
    if (!selectedId || busy || !window.confirm(`Permanently delete “${asset.file.originalFilename}” from CDN storage?`)) return;
    setBusy(true); setError(""); setMessage("");
    try { await requestJson(`/api/v1/cdn/assets/${asset.id}`, { method: "DELETE" }); await refreshAssets(selectedId); await refreshFolders(); setMessage("CDN file deleted."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete the file."); }
    finally { setBusy(false); }
  }

  async function copyLink(asset: Asset) {
    const url = `${appUrl.replace(/\/$/, "")}${asset.contentUrl}`;
    try { await navigator.clipboard.writeText(url); setMessage(asset.isPublic ? "Public URL copied." : "Login-protected URL copied; only people with folder access can open it."); setError(""); }
    catch { setError("Clipboard access failed. Copy the link from the browser address bar."); }
  }

  return <div className="mx-auto w-full max-w-6xl space-y-5">
    <header><p className="text-xs text-slate-400">Administration · CDN</p><h1 className="mt-2 text-2xl font-semibold">CDN files</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Organize shared assets, grant folder access to HEXVAULT accounts, and choose public or login-protected links for each file.</p></header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {owner && <form onSubmit={createFolder} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"><label className="text-xs font-semibold">New CDN folder<input required minLength={2} maxLength={80} name="name" placeholder="e.g. Marketing assets" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="text-xs font-semibold">Description (optional)<input maxLength={400} name="description" placeholder="What this folder is used for" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><button disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f46327] px-4 text-xs font-semibold text-white disabled:opacity-50"><FolderPlus size={15}/>Create folder</button></form>}
    {!folders.length ? <section className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><FolderPlus className="mx-auto text-slate-300" size={28}/><h2 className="mt-3 text-sm font-semibold">{owner ? "Create your first CDN folder" : "No CDN folders are shared with you"}</h2><p className="mt-1 text-xs text-slate-500">{owner ? "Folders let you organize assets and grant access to selected employees." : "Ask the Owner to grant you access to a CDN folder."}</p></section> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(220px,.7fr)_minmax(0,2fr)]">
      <nav aria-label="CDN folders" className="rounded-xl border border-slate-200 bg-white p-2">{folders.map(folder => <button key={folder.id} onClick={() => { setLoading(true); setSelectedId(folder.id); }} aria-current={folder.id === selectedId ? "page" : undefined} className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-xs ${folder.id === selectedId ? "bg-orange-50 font-semibold text-[#b94512]" : "text-slate-600 hover:bg-slate-50"}`}><span className="min-w-0 truncate">{folder.name}</span><span className="shrink-0 text-[10px] text-slate-400">{folder._count?.assets ?? ""}</span></button>)}</nav>
      {selected && <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">{selected.name}</h2>{selected.description && <p className="mt-1 text-xs text-slate-500">{selected.description}</p>}<p className="mt-2 text-[11px] text-slate-400">{selected.access.canManage ? "You can manage these files." : selected.access.canUpload ? "You can view and upload files." : "View access."}</p></div>{selected.access.canUpload || selected.access.canManage ? <form onSubmit={uploadFiles} className="flex flex-wrap items-center gap-2"><input name="files" type="file" multiple aria-label="Choose CDN files to upload" disabled={busy} className="max-w-full text-xs"/><button disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#f46327] px-3 text-xs font-semibold text-white disabled:opacity-50"><Upload size={14}/>{busy ? "Working…" : "Upload"}</button></form> : null}</div><p className="mt-2 text-[10px] text-slate-400">Files up to 50 MB are malware-scanned before they can be shared.</p></section>
        {owner && <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center gap-2"><Users size={15} className="text-[#c74410]"/><h3 className="text-sm font-semibold">Folder access</h3></div><form onSubmit={grantAccess} className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto_auto_auto]"><label className="text-xs font-semibold">Employee account<select required value={selectedUser} onChange={event => { const userId = event.target.value; setSelectedUser(userId); const existing = grants.find(grant => grant.user.id === userId); setCanManage(existing?.canManage ?? false); setCanUpload(existing?.canUpload ?? false); }} disabled={busy} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"><option value="">Choose employee</option>{people.map(person => <option key={person.id} value={person.id}>{person.employee.fullName} · {person.email}{grants.some(grant => grant.user.id === person.id) ? " · Update access" : ""}</option>)}</select></label><label className="flex items-center gap-2 self-end pb-3 text-xs"><input type="checkbox" checked={canUpload} onChange={event => setCanUpload(event.target.checked)} disabled={busy || canManage}/>Upload</label><label className="flex items-center gap-2 self-end pb-3 text-xs"><input type="checkbox" checked={canManage} onChange={event => { setCanManage(event.target.checked); if (event.target.checked) setCanUpload(true); }} disabled={busy}/>Manage files</label><button disabled={busy || !selectedUser} className="h-10 self-end rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50">Grant / update access</button></form><div className="mt-4 divide-y divide-slate-100">{grants.length ? grants.map(grant => <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-xs font-semibold">{grant.user.employee.fullName}<span className="ml-2 font-normal text-slate-400">{grant.user.employee.employeeCode}</span></p><p className="mt-1 text-[10px] text-slate-500">{grant.user.email} · {grant.canManage ? "View, upload, manage files" : grant.canUpload ? "View and upload" : "View files"}</p></div><button disabled={busy} onClick={() => revokeAccess(grant.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-semibold text-rose-600 disabled:opacity-50">Revoke</button></div>) : <p className="py-4 text-xs text-slate-400">No employees have been granted access.</p>}</div></section>}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h3 className="text-sm font-semibold">Files</h3></div>{loading ? <p className="px-5 py-12 text-center text-xs text-slate-400">Loading files…</p> : assets.length ? <div className="divide-y divide-slate-100">{assets.map(asset => <article key={asset.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-xs font-semibold">{asset.file.originalFilename}</p><p className="mt-1 text-[10px] text-slate-500">{formatSize(asset.file.sizeBytes)} · {asset.file.mimeType} · {new Date(asset.file.createdAt).toLocaleDateString()}</p><p className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${asset.isPublic ? "text-emerald-700" : "text-slate-500"}`}>{asset.isPublic ? <><Globe2 size={12}/>Public link</> : <><LockKeyhole size={12}/>Login-protected</>}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => copyLink(asset)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold"><Copy size={12}/>Copy link</button>{asset.isPublic && <a href={asset.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold"><ExternalLink size={12}/>Open</a>}{mayManage && <button disabled={busy} onClick={() => setPublic(asset)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold disabled:opacity-50">{asset.isPublic ? <><LockKeyhole size={12}/>Make private</> : <><Globe2 size={12}/>Make public</>}</button>}{mayManage && <button disabled={busy} onClick={() => deleteAsset(asset)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-semibold text-rose-600 disabled:opacity-50"><Trash2 size={12}/>Delete</button>}</div></article>)}</div> : <p className="px-5 py-12 text-center text-xs text-slate-400">No clean files in this folder yet.</p>}</section>
        <p className="flex items-center gap-2 px-1 text-[10px] text-slate-400"><Shield size={12}/>Public files are downloadable by anyone with the link. Other files require a HEXVAULT session and folder access.</p>
      </div>}
    </div>}
  </div>;
}
