"use client";
import { uploadPrivateFile } from "@/lib/private-upload";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, ImagePlus, Package, Plus } from "lucide-react";
import { formatProductPrice, productSchema, type CatalogProduct, type ProductInput } from "@core/features/products/catalog";

const inputClass = "mt-2 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal";
const buttonClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50";
const emptyProduct: ProductInput = {
  name: "", title: "", description: "", detail: "", imageUrl: "", imageAlt: "", logoUrl: "",
  price: "", currency: "INR", priceSuffix: "", features: [], ctaLabel: "Learn more", ctaUrl: "", published: false, sortOrder: 0,
};

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request could not be completed. Please try again.");
  return body.data;
}

async function uploadProductImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Choose an image smaller than 10 MB.");
  const { items: folders } = await api("/api/v1/cdn/folders");
  let folder = folders.find((item: { name: string }) => item.name === "Website product images");
  if (!folder) {
    try {
      const created = await api("/api/v1/cdn/folders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Website product images", description: "Images and logos for the public product catalog." }) });
      folder = created.item;
    } catch (error) {
      const refreshed = await api("/api/v1/cdn/folders");
      folder = refreshed.items.find((item: { name: string }) => item.name === "Website product images");
      if (!folder) throw error;
    }
  }
  const upload = await api("/api/v1/cdn/uploads/init", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderId: folder.id, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size }) });
  const response = await uploadPrivateFile(upload.uploadUrl, upload, file);
  if (!response.ok) throw new Error("The image upload failed. Please try again.");
  await api("/api/v1/cdn/uploads/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileId: upload.fileId }) });
  await api(`/api/v1/cdn/assets/${upload.assetId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isPublic: true }) });
  return `/api/v1/cdn/assets/${upload.assetId}/content`;
}

function ProductEditor({ product, onSave, onCancel }: { product: CatalogProduct | null; onSave: (product: CatalogProduct) => void; onCancel: () => void }) {
  const [form, setForm] = useState<ProductInput>(() => {
    if (!product) return { ...emptyProduct, features: [] };
    const input = { ...product };
    Reflect.deleteProperty(input, "id");
    return input;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm(current => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const result = productSchema.safeParse({ ...form, features: form.features.filter(item => item.value.trim() || item.label.trim()) });
    if (!result.success) { setError(result.error.issues.map(issue => `${issue.path.join(" ")}: ${issue.message}`).slice(0, 3).join(" ")); return; }
    setBusy(true);
    try {
      const data = await api(product ? `/api/v1/products/${product.id}` : "/api/v1/products", { method: product ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(result.data) });
      onSave(data.item);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save product."); }
    finally { setBusy(false); }
  }

  async function upload(file: File, field: "imageUrl" | "logoUrl") {
    setBusy(true); setError(""); setUploading(field);
    try { set(field, await uploadProductImage(file)); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to upload image."); }
    finally { setBusy(false); setUploading(""); }
  }

  return <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
    <div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">{product ? `Edit ${product.name}` : "Add product"}</h2><button type="button" disabled={busy} className={buttonClass} onClick={onCancel}>Cancel</button></div>
    <fieldset disabled={busy} className="grid min-w-0 gap-5 md:grid-cols-2">
      <label className="text-xs font-semibold">Product name<input required maxLength={80} className={inputClass} value={form.name} onChange={event => set("name", event.target.value)} /></label>
      <label className="text-xs font-semibold">Headline<input required maxLength={140} className={inputClass} value={form.title} onChange={event => set("title", event.target.value)} /></label>
      <label className="text-xs font-semibold md:col-span-2">Short description<textarea required maxLength={500} rows={3} className={inputClass} value={form.description} onChange={event => set("description", event.target.value)} /></label>
      <label className="text-xs font-semibold md:col-span-2">Full details<textarea maxLength={5000} rows={5} className={inputClass} value={form.detail} onChange={event => set("detail", event.target.value)} /><span className="mt-1 block font-normal text-slate-500">Shown when a visitor selects the product button without a destination URL.</span></label>

      {([ ["imageUrl", "Product image"], ["logoUrl", "Product logo"] ] as const).map(([field, label]) => <div key={field} className="min-w-0 rounded-xl border border-slate-200 p-4">
        <label className="block text-xs font-semibold">{label} URL<input maxLength={2048} className={inputClass} placeholder="https://… or /api/v1/cdn/…" value={form[field] ?? ""} onChange={event => set(field, event.target.value)} /></label>
        {form[field] && <div className="relative mt-3 h-36 overflow-hidden rounded-lg bg-slate-100"><Image src={form[field]} alt={`${label} preview`} fill unoptimized className="object-contain" /></div>}
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold"><ImagePlus size={16} />{uploading === field ? "Uploading and scanning…" : `Upload ${label.toLowerCase()}`}<input aria-label={`Upload ${label.toLowerCase()}`} type="file" accept="image/jpeg,image/png,image/webp" className="min-w-0 flex-1 text-[10px] font-normal" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, field); event.currentTarget.value = ""; }} /></label>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">JPEG, PNG, or WebP, up to 10 MB. Uploaded images are public website assets.</p>
      </div>)}
      <label className="text-xs font-semibold md:col-span-2">Image description<input maxLength={180} className={inputClass} value={form.imageAlt ?? ""} onChange={event => set("imageAlt", event.target.value)} /><span className="mt-1 block font-normal text-slate-500">Describe the image for visitors using a screen reader.</span></label>

      <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3 md:col-span-2">
        <label className="text-xs font-semibold">Price<input type="number" min="0" max="9999999999.99" step="0.01" placeholder="Leave blank to hide" className={inputClass} value={form.price ?? ""} onChange={event => set("price", event.target.value)} /></label>
        <label className="text-xs font-semibold">Currency<select className={inputClass} value={form.currency} onChange={event => set("currency", event.target.value)}>{Array.from(new Set(["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SGD", form.currency])).map(currency => <option key={currency}>{currency}</option>)}</select></label>
        <label className="text-xs font-semibold">Price suffix<input maxLength={40} placeholder="/ month, / year, one-time" className={inputClass} value={form.priceSuffix ?? ""} onChange={event => set("priceSuffix", event.target.value)} /></label>
      </div>
      <div className="md:col-span-2"><h3 className="text-sm font-semibold">Highlights <span className="font-normal text-slate-500">(optional, up to three)</span></h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{[0, 1, 2].map(index => <div key={index} className="rounded-xl border border-slate-200 p-3">
        <label className="text-xs font-semibold">Highlight {index + 1} value<input maxLength={24} className={inputClass} value={form.features[index]?.value ?? ""} onChange={event => { const features = Array.from({ length: 3 }, (_, i) => ({ value: form.features[i]?.value ?? "", label: form.features[i]?.label ?? "" })); features[index].value = event.target.value; set("features", features); }} /></label>
        <label className="mt-3 block text-xs font-semibold">Highlight {index + 1} label<input maxLength={40} className={inputClass} value={form.features[index]?.label ?? ""} onChange={event => { const features = Array.from({ length: 3 }, (_, i) => ({ value: form.features[i]?.value ?? "", label: form.features[i]?.label ?? "" })); features[index].label = event.target.value; set("features", features); }} /></label>
      </div>)}</div></div>
      <label className="text-xs font-semibold">Button label<input required maxLength={40} className={inputClass} value={form.ctaLabel} onChange={event => set("ctaLabel", event.target.value)} /></label>
      <label className="text-xs font-semibold">Button destination (optional)<input maxLength={2048} placeholder="https://… or /contact" className={inputClass} value={form.ctaUrl ?? ""} onChange={event => set("ctaUrl", event.target.value)} /></label>
      <label className="text-xs font-semibold">Display order<input required type="number" min="0" max="10000" step="1" className={inputClass} value={form.sortOrder} onChange={event => set("sortOrder", Number(event.target.value))} /><span className="mt-1 block font-normal text-slate-500">Lower numbers appear first.</span></label>
      <label className="flex items-center gap-3 self-center rounded-xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={form.published} onChange={event => set("published", event.target.checked)} />Publish on the website</label>
    </fieldset>
    {error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5"><button disabled={busy} className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? uploading ? "Uploading and scanning…" : "Saving…" : form.published ? "Save and publish" : "Save draft"}</button><p className="text-xs text-slate-500">Only published products appear on the public page.</p></div>
  </form>;
}

export function ProductManager() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editor, setEditor] = useState<CatalogProduct | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    api("/api/v1/products").then(data => { if (alive) { setItems(data.items); setLoading(false); setError(""); } }).catch(error => { if (alive) { setError(error instanceof Error ? error.message : "Unable to load products."); setLoading(false); } });
    return () => { alive = false; };
  }, [reload]);

  async function remove(id: string) {
    setBusy(true); setError(""); setMessage("");
    try { await api(`/api/v1/products/${id}`, { method: "DELETE" }); setItems(current => current.filter(item => item.id !== id)); setConfirmDelete(null); setMessage("Product deleted."); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to delete product."); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-6xl">
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-400">Administration / Website products</p><h1 className="mt-2 text-2xl font-semibold">Website products</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">Manage product names, images, prices, and details shown on your public website.</p></div><div className="flex gap-2"><Link href="/products" target="_blank" className={`${buttonClass} inline-flex items-center gap-2`}>View website <ArrowUpRight size={14} /></Link>{!editor && <button disabled={loading || !!error || busy} className={`${buttonClass} inline-flex items-center gap-2`} onClick={() => { setEditor("new"); setMessage(""); }}><Plus size={14} />Add product</button>}</div></div>
    {message && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
    {error && <div role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error} <button className="ml-2 underline" onClick={() => { setLoading(true); setReload(value => value + 1); }}>Retry</button></div>}
    {editor ? <ProductEditor key={editor === "new" ? "new" : editor.id} product={editor === "new" ? null : editor} onCancel={() => setEditor(null)} onSave={product => { setItems(current => [...current.filter(item => item.id !== product.id), product].sort((a,b) => a.sortOrder - b.sortOrder)); setEditor(null); setMessage(product.published ? "Product saved and published. The website now uses the updated content and price." : "Draft saved. This product is hidden from the public website."); }} /> : loading ? <p role="status" className="py-12 text-center text-sm text-slate-500">Loading products…</p> : !error && items.length === 0 ? <div className="grid justify-items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Package size={34} className="text-slate-400" /><h2 className="text-lg font-semibold">Add your first product</h2><p className="max-w-sm text-sm leading-relaxed text-slate-500">Your product page is ready. Add your content and images, set a price, and publish when you are ready.</p><button className={buttonClass} onClick={() => setEditor("new")}>Add product</button></div> : <div className="grid gap-4">{items.map(item => <article key={item.id} className="flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">{item.imageUrl ? <Image src={item.imageUrl} alt="" fill unoptimized className="object-cover" /> : <Package size={25} className="text-slate-400" />}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-base font-semibold">{item.name}</h2><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.published ? "Published" : "Draft"}</span></div><p className="mt-1 break-words text-sm text-slate-500">{item.title}</p><p className="mt-2 text-xs font-semibold">{formatProductPrice(item) ?? "Price hidden"}<span className="ml-4 font-normal text-slate-400">Order: {item.sortOrder}</span></p></div>
      <div className="flex flex-wrap items-center gap-2">{confirmDelete === item.id ? <><span className="text-xs text-rose-700">Delete this product?</span><button disabled={busy} className={`${buttonClass} text-rose-700`} onClick={() => void remove(item.id)}>Confirm delete</button><button disabled={busy} className={buttonClass} onClick={() => setConfirmDelete(null)}>Cancel</button></> : <><button disabled={busy} className={buttonClass} onClick={() => { setEditor(item); setMessage(""); setConfirmDelete(null); }}>Edit</button><button disabled={busy} className={`${buttonClass} text-rose-700`} onClick={() => setConfirmDelete(item.id)}>Delete</button></>}</div>
    </article>)}</div>}
  </div>;
}
