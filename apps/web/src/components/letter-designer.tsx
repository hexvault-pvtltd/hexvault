"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { PDFDocument } from "pdf-lib";
import { buildLetterPdf } from "@core/features/letters/pdf";
import { decodeDataUrl, type DocumentFields, type DocumentPlan, type PlannedRegion } from "@core/features/letters/layout";
import { defaultLetterLayout, newTextBlock, type LetterBlock, type LetterLayout, type PageSize } from "@core/features/letters/layout-schema";
import { arrangeOnLetterhead, suggestedContentArea } from "@core/features/letters/letterhead";
import { LetterheadSetup } from "./letterhead-setup";

const field = "mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal";
const button = "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium disabled:opacity-40";
const mm = (points: number) => Math.round(points / 72 * 25.4 * 10) / 10;
const pt = (millimeters: number) => millimeters / 25.4 * 72;
function fileData(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Unable to read this file.")); reader.readAsDataURL(file); });
}
function PdfCanvas({ bytes, pageNumber }: { bytes: Uint8Array; pageNumber: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      if (!cancelled) setError("");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      if (cancelled) return;
      const task = pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true });
      destroy = () => { void task.destroy(); };
      const document = await task.promise;
      if (cancelled) return;
      const page = await document.getPage(pageNumber + 1);
      const viewport = page.getViewport({ scale: 1.4 });
      const canvas = ref.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
    })().catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : "Preview could not be displayed."); });
    return () => { cancelled = true; destroy?.(); };
  }, [bytes, pageNumber]);
  return <>{error && <p role="alert" className="absolute inset-x-4 top-8 z-20 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}<canvas ref={ref} className="block h-full w-full"/></>;
}

export function LetterDesigner({ fields, value, onChange, disabled = false, readOnly = false, approved = false }: {
  fields: DocumentFields; value?: LetterLayout | null; onChange: (layout: LetterLayout) => void; disabled?: boolean; readOnly?: boolean; approved?: boolean;
}) {
  const layout = value ?? defaultLetterLayout();
  const [selectedId, setSelectedId] = useState("body"), [pageIndex, setPageIndex] = useState(0);
  const [preview, setPreview] = useState<{ bytes: Uint8Array; plan: DocumentPlan } | null>(null);
  const [error, setError] = useState(""), [rendering, setRendering] = useState(false), [grid, setGrid] = useState(true);
  const [history, setHistory] = useState<LetterLayout[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; region: PlannedRegion; layout: LetterLayout } | null>(null);
  const locked = disabled || readOnly;
  const serialized = JSON.stringify({ ...fields, layout });
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setRendering(true);
      const input = JSON.parse(serialized);
      buildLetterPdf({ ...input, id: "EDITOR-PREVIEW" }, !approved).then(result => {
        if (!cancelled) { setPreview(result); setError(""); }
      }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : "Unable to render the document."); })
        .finally(() => { if (!cancelled) setRendering(false); });
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [serialized, approved]);
  const selected = layout.blocks.find(block => block.id === selectedId);
  const plan = preview?.plan;
  const activePage = Math.min(pageIndex, (plan?.pages.length ?? layout.pages.length) - 1);
  const size = plan?.pages[activePage] ?? layout.pages[0];
  const selectedRegion = plan?.regions.find(region => region.id === selectedId && region.page === activePage) ?? plan?.regions.find(region => region.id === selectedId);
  function commit(next: LetterLayout, remember = true) {
    if (locked) return;
    if (remember) setHistory(previous => [...previous.slice(-19), structuredClone(layout)]);
    onChange(next);
  }
  function patchBlock(changes: Partial<LetterBlock>, remember = true) {
    if (!selected) return;
    commit({ ...layout, blocks: layout.blocks.map(block => block.id === selectedId ? { ...block, ...changes } : block) }, remember);
  }
  function position(x: number, y: number, page = activePage) {
    if (!selected) return;
    const pageSize = plan?.pages[page] ?? size;
    patchBlock({ x: Math.max(layout.contentArea?.left ?? 0, Math.min(x, pageSize.width - (layout.contentArea?.right ?? 0) - selected.width)), y: Math.max(layout.contentArea?.top ?? 0, Math.min(y, pageSize.height - (layout.contentArea?.bottom ?? layout.marginBottom) - (selected.kind === "image" ? selected.height : selected.fontSize * selected.lineHeight))), page, afterId: null });
  }
  function nudge(dx: number, dy: number) {
    if (!selected) return;
    position((selected.afterId ? selectedRegion?.x ?? selected.x : selected.x) + dx, (selected.afterId ? selectedRegion?.y ?? selected.y : selected.y) + dy, selected.afterId ? selectedRegion?.page : selected.page);
  }
  function resizePages(nextSize: PageSize, target = -1) {
    const pages = layout.pages.map((page, index) => target === -1 || target === index ? nextSize : page);
    const blocks = layout.blocks.map(block => {
      if (target !== -1 && block.page !== target) return block;
      const old = layout.pages[Math.min(block.page, layout.pages.length - 1)];
      return { ...block, x: block.x * nextSize.width / old.width, width: block.width * nextSize.width / old.width, y: block.y * nextSize.height / old.height };
    });
    const next = { ...layout, pages, blocks };
    commit(next.contentArea ? arrangeOnLetterhead(next, next.contentArea) : next);
  }
  async function upload(file: File | undefined, kind: "template" | "signature") {
    if (!file || locked) return;
    setError("");
    try {
      if (file.size > (kind === "template" ? 3000000 : 2000000)) throw new Error(`Use a file smaller than ${kind === "template" ? "3" : "2"} MB.`);
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || (kind === "signature" && file.type === "application/pdf")) throw new Error("Use a PDF, PNG, or JPEG template, and a PNG or JPEG signature.");
      const data = await fileData(file);
      if (kind === "signature") {
        const image = new Image(); image.src = data; await image.decode();
        const width = Math.min(150, size.width - 80), height = width * image.naturalHeight / image.naturalWidth;
        if (selected?.kind === "image") { patchBlock({ image: data, height: Math.max(8, Math.min(selected.width * image.naturalHeight / image.naturalWidth, 200)) }); return; }
        const id = crypto.randomUUID();
        const signatureIndex = layout.blocks.findIndex(block => block.id === "signature" && block.afterId === "body");
        const imageBlock = newTextBlock(id, { kind: "image", image: data, text: "", width, height: Math.max(8, Math.min(height, 200)), afterId: signatureIndex >= 0 ? "body" : layout.blocks.at(-1)?.id ?? null, gap: 24 });
        const blocks = [...layout.blocks];
        if (signatureIndex >= 0) { blocks.splice(signatureIndex, 0, imageBlock); blocks[signatureIndex + 1] = { ...blocks[signatureIndex + 1], afterId: id, gap: 8 }; }
        else blocks.push(imageBlock);
        commit({ ...layout, blocks }); setSelectedId(id);
      } else {
        let pages = layout.pages;
        if (file.type === "application/pdf") {
          const pdf = await PDFDocument.load(decodeDataUrl(data));
          if (pdf.getPageCount() > 30) throw new Error("Use a PDF template with at most 30 pages.");
          pages = pdf.getPages().map(page => page.getRotation().angle % 180 === 0
            ? { width: page.getWidth(), height: page.getHeight() }
            : { width: page.getHeight(), height: page.getWidth() });
        }
        const newSize = pages[0], oldSize = layout.pages[0];
        const next: LetterLayout = { ...layout, pages, background: { name: file.name, kind: file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpeg", data }, blocks: layout.blocks.map(block => ({ ...block, x: block.x * newSize.width / oldSize.width, width: block.width * newSize.width / oldSize.width, y: block.y * newSize.height / oldSize.height })) };
        commit(arrangeOnLetterhead(next, next.contentArea ?? suggestedContentArea(next))); setPageIndex(0);
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to use this file."); }
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, region: PlannedRegion) {
    setSelectedId(region.id);
    if (locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: region.id, startX: event.clientX, startY: event.clientY, region, layout };
    setHistory(previous => [...previous.slice(-19), structuredClone(layout)]);
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    const start = dragRef.current, rect = canvasRef.current?.getBoundingClientRect();
    if (!start || !rect || locked) return;
    const snap = (value: number) => grid && !event.altKey ? Math.round(value / 5) * 5 : value;
    const x = snap(start.region.x + (event.clientX - start.startX) / rect.width * size.width);
    const y = snap(start.region.y + (event.clientY - start.startY) / rect.height * size.height);
    onChange({ ...start.layout, blocks: start.layout.blocks.map(block => block.id === start.id ? { ...block, page: start.region.page, x: Math.max(layout.contentArea?.left ?? 0, Math.min(x, size.width - (layout.contentArea?.right ?? 0) - block.width)), y: Math.max(layout.contentArea?.top ?? 0, Math.min(y, size.height - (layout.contentArea?.bottom ?? layout.marginBottom) - start.region.height)), afterId: null } : block) });
  }
  function addText() {
    const id = crypto.randomUUID();
    commit({ ...layout, blocks: [...layout.blocks, newTextBlock(id, layout.contentArea
      ? { page: 0, x: layout.contentArea.left, y: layout.contentArea.top, width: Math.min(...layout.pages.map(page => page.width)) - layout.contentArea.left - layout.contentArea.right, afterId: layout.blocks.at(-1)?.id ?? null }
      : { page: activePage, x: 40, y: 100, width: size.width - 80 })] }); setSelectedId(id);
  }
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3 md:p-4" aria-label={readOnly ? "Document layout review" : "Document designer"}>
    {/* Contain the absolute sr-only inputs in their labels, not the outer page. */}
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">{readOnly ? "Document layout review" : "Document designer"}</h3><p className="mt-1 text-xs text-slate-500">{readOnly ? "Review the actual layout before approving or sharing." : "Select text on the page. Drag, use arrow keys, or adjust its position and alignment."}</p></div><span className="text-xs text-slate-500" role="status">{rendering ? "Updating preview..." : `${plan?.pages.length ?? layout.pages.length} page(s)`}</span></div>
    {!readOnly && <div className="flex flex-wrap items-center gap-2"><label className={`relative ${button}`}>Upload letterhead / template<input disabled={locked} className="sr-only" type="file" accept="application/pdf,image/png,image/jpeg" onChange={event => { void upload(event.target.files?.[0], "template"); event.target.value = ""; }}/></label><label className={`relative ${button}`}>Add signature / image<input disabled={locked} className="sr-only" type="file" accept="image/png,image/jpeg" onChange={event => { void upload(event.target.files?.[0], "signature"); event.target.value = ""; }}/></label><button disabled={locked} type="button" className={button} onClick={addText}>Add text</button><button disabled={locked || history.length === 0} type="button" className={button} onClick={() => { const previous = history.at(-1); if (previous) { onChange(previous); setHistory(history.slice(0, -1)); } }}>Undo</button><button disabled={locked} type="button" className={button} onClick={() => commit(defaultLetterLayout())}>Reset layout</button>{layout.background && <button disabled={locked} type="button" className={button} onClick={() => commit({ ...layout, background: null })}>Remove {layout.background.name}</button>}</div>}
    {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-xs text-rose-700">{error} The last valid preview remains visible.</p>}
    {!readOnly && <LetterheadSetup layout={layout} disabled={locked} onChange={commit} onError={setError}/>}
    <div className={`grid items-start gap-4 ${readOnly ? "" : "xl:grid-cols-[240px_minmax(0,1fr)]"}`}>
      {!readOnly && <fieldset disabled={locked} className="space-y-4 rounded-lg border border-slate-200 bg-white p-3">
        <details open><summary className="text-xs font-semibold">Page setup</summary><div className="mt-3 space-y-3"><label className="block text-xs">Paper size<select className={field} value="" onChange={event => { const presets: Record<string, PageSize> = { A4: { width: 595.28, height: 841.89 }, A3: { width: 841.89, height: 1190.55 }, A5: { width: 419.53, height: 595.28 }, Letter: { width: 612, height: 792 }, Legal: { width: 612, height: 1008 } }; if (presets[event.target.value]) resizePages(presets[event.target.value]); }}><option value="">Custom / choose preset</option>{["A4", "A3", "A5", "Letter", "Legal"].map(name => <option key={name}>{name}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="text-xs">Width (mm)<input className={field} type="number" min={25.4} max={1058} step={0.1} value={mm(layout.pages[0].width)} onChange={event => { const width = pt(Number(event.target.value)); if (width >= 72 && width <= 3000) resizePages({ ...layout.pages[0], width }); }}/></label><label className="text-xs">Height (mm)<input className={field} type="number" min={25.4} max={1058} step={0.1} value={mm(layout.pages[0].height)} onChange={event => { const height = pt(Number(event.target.value)); if (height >= 72 && height <= 3000) resizePages({ ...layout.pages[0], height }); }}/></label></div><div className="flex gap-2"><button type="button" className={button} onClick={() => resizePages({ width: Math.min(size.width, size.height), height: Math.max(size.width, size.height) })}>Portrait</button><button type="button" className={button} onClick={() => resizePages({ width: Math.max(size.width, size.height), height: Math.min(size.width, size.height) })}>Landscape</button></div>{!layout.contentArea && <div className="grid grid-cols-2 gap-2">{(["marginTop", "marginBottom"] as const).map(key => <label key={key} className="text-xs">{key === "marginTop" ? "Top" : "Bottom"} margin (pt)<input type="number" step="any" min={key === "marginBottom" ? 24 : 12} max={250} className={field} value={layout[key]} onChange={event => { const number = Number(event.target.value); if (number >= (key === "marginBottom" ? 24 : 12) && number <= 250) commit({ ...layout, [key]: number }); }}/></label>)}</div>}<button type="button" disabled={(plan?.pages.length ?? layout.pages.length) >= 30} className={button} onClick={() => { const pages = plan?.pages ?? layout.pages; commit({ ...layout, pages: [...pages, { ...size }] }); setPageIndex(pages.length); }}>Add page</button><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)}/>Show grid and snap to 5 pt</label></div></details>
        <label className="block text-xs font-semibold">Select block<select value={selectedId} onChange={event => setSelectedId(event.target.value)} className={field}><option value="">Select...</option>{layout.blocks.map((block, index) => <option key={block.id} value={block.id}>{index + 1}. {block.kind === "image" ? "Signature / image" : block.binding === "custom" ? block.text.slice(0, 28) || "Text" : block.binding}</option>)}</select></label>
        {selected && <div className="space-y-3 border-t border-slate-200 pt-3">
          {selected.kind === "text" && <><label className="block text-xs">Text source<select value={selected.binding} className={field} onChange={event => patchBlock({ binding: event.target.value as LetterBlock["binding"] })}>{["title", "body", "companyName", "recipientName", "documentDate", "custom"].map(binding => <option key={binding} value={binding}>{binding === "custom" ? "Custom text / signature" : binding}</option>)}</select></label>{selected.binding === "custom" && <label className="block text-xs">Text<textarea aria-label="Custom block text" rows={4} maxLength={16000} value={selected.text} className={field} onChange={event => patchBlock({ text: event.target.value })}/></label>}<label className="block text-xs">Font<select value={selected.fontFamily} className={field} onChange={event => patchBlock({ fontFamily: event.target.value as LetterBlock["fontFamily"] })}>{["Helvetica", "Times", "Courier"].map(font => <option key={font}>{font}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="text-xs">Size (pt)<input className={field} type="number" step="any" min={6} max={120} value={selected.fontSize} onChange={event => { const number = Number(event.target.value); if (number >= 6 && number <= 120) patchBlock({ fontSize: number }); }}/></label><label className="text-xs">Line spacing<input className={field} type="number" min={1} max={2.5} step={0.1} value={selected.lineHeight} onChange={event => { const number = Number(event.target.value); if (number >= 1 && number <= 2.5) patchBlock({ lineHeight: number }); }}/></label></div><div className="flex gap-2"><button type="button" aria-pressed={selected.bold} className={`${button} ${selected.bold ? "bg-orange-100" : ""}`} onClick={() => patchBlock({ bold: !selected.bold })}>Bold</button><button type="button" aria-pressed={selected.italic} className={`${button} ${selected.italic ? "bg-orange-100" : ""}`} onClick={() => patchBlock({ italic: !selected.italic })}>Italic</button></div><label className="block text-xs">Text alignment<select value={selected.align} className={field} onChange={event => patchBlock({ align: event.target.value as LetterBlock["align"] })}>{["left", "center", "right", "justify"].map(align => <option key={align}>{align}</option>)}</select></label></>}
          <div className="grid grid-cols-2 gap-2">{(["x", "y", "width", ...(selected.kind === "image" ? ["height"] : [])] as ("x" | "y" | "width" | "height")[]).map(key => <label key={key} className="text-xs">{key === "x" ? "Left" : key === "y" ? "Top" : key} (pt)<input className={field} type="number" step="any" min={key === "width" ? 12 : key === "height" ? 8 : 0} max={key === "height" ? 1500 : 3000} value={Math.round((selected.afterId && selectedRegion && (key === "x" || key === "y") ? selectedRegion[key] : selected[key]) * 10) / 10} onChange={event => { const number = Number(event.target.value); if (number >= 0 && number <= 3000) patchBlock({ [key]: number, ...(key === "x" || key === "y" ? { afterId: null, page: activePage, x: key === "x" ? number : selectedRegion?.x ?? selected.x, y: key === "y" ? number : selectedRegion?.y ?? selected.y } : {}) }); }}/></label>)}</div>
          <div className="flex flex-wrap gap-1" aria-label="Move selected block">{[["←", -5, 0, "Move left"], ["↑", 0, -5, "Move up"], ["↓", 0, 5, "Move down"], ["→", 5, 0, "Move right"]].map(([symbol, dx, dy, label]) => <button key={String(label)} type="button" className={button} aria-label={String(label)} onClick={() => nudge(Number(dx), Number(dy))}>{symbol}</button>)}</div>
          <div className="flex flex-wrap gap-1">{(["left", "center", "right"] as const).map(align => <button key={align} type="button" className={button} onClick={() => position(align === "left" ? 36 : align === "right" ? size.width - 36 - selected.width : (size.width - selected.width) / 2, selectedRegion?.y ?? selected.y)}>{align} on page</button>)}</div>
          <label className="block text-xs">Follow block<select value={selected.afterId ?? ""} className={field} onChange={event => patchBlock({ afterId: event.target.value || null })}><option value="">Manual position</option>{layout.blocks.slice(0, layout.blocks.findIndex(block => block.id === selectedId)).map(block => <option key={block.id} value={block.id}>{block.binding === "custom" ? block.text.slice(0, 20) : block.binding}</option>)}</select></label>
          {selected.afterId && <label className="block text-xs">Space after preceding block (pt)<input className={field} type="number" min={0} max={300} value={selected.gap} onChange={event => { const number = Number(event.target.value); if (number >= 0 && number <= 300) patchBlock({ gap: number }); }}/></label>}
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.flow} onChange={event => patchBlock({ flow: event.target.checked })}/>Continue onto new pages automatically</label>
          <label className="block text-xs">Start on page<input className={field} type="number" min={1} max={100} value={selected.page + 1} onChange={event => { const number = Number(event.target.value); if (number >= 1 && number <= 100) { patchBlock({ page: number - 1, afterId: null }); setPageIndex(number - 1); } }}/></label>
          <button type="button" className={`${button} text-rose-600`} onClick={() => { commit({ ...layout, blocks: layout.blocks.filter(block => block.id !== selectedId).map(block => block.afterId === selectedId ? { ...block, afterId: selected.afterId } : block) }); setSelectedId(""); }}>Remove block</button>
        </div>}
      </fieldset>}
      <div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><label className="text-xs">Page <select aria-label="Preview page" value={activePage} onChange={event => setPageIndex(Number(event.target.value))} className="rounded-md border bg-white px-2 py-1">{(plan?.pages ?? layout.pages).map((_, index) => <option key={index} value={index}>{index + 1}</option>)}</select> <span className="ml-2 text-slate-500">{mm(size.width)} × {mm(size.height)} mm</span></label>{!readOnly && selected?.afterId && <span className="text-xs text-slate-500">Moving detaches this block from automatic following.</span>}</div>
        <div className="overflow-auto rounded-lg bg-slate-200 p-3 md:p-5"><div ref={canvasRef} className="relative mx-auto w-full max-w-[850px] bg-white shadow-md" style={{ aspectRatio: `${size.width}/${size.height}` }}>
          {preview && <PdfCanvas bytes={preview.bytes} pageNumber={activePage}/>}
          {!readOnly && grid && <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)", backgroundSize: `${20 / size.width * 100}% ${20 / size.height * 100}%` }}/>}
          {!readOnly && layout.contentArea && <div aria-hidden="true" className="pointer-events-none absolute border-2 border-dashed border-emerald-600" style={{ left: `${layout.contentArea.left / size.width * 100}%`, top: `${layout.contentArea.top / size.height * 100}%`, right: `${layout.contentArea.right / size.width * 100}%`, bottom: `${layout.contentArea.bottom / size.height * 100}%` }}><span className="absolute -top-5 left-0 rounded bg-emerald-50 px-1 text-[10px] text-emerald-900">Printable area</span></div>}
          {!readOnly && plan?.regions.filter(region => region.page === activePage).map((region, index) => <button key={`${region.id}-${index}`} type="button" disabled={locked} aria-label={`Select ${layout.blocks.find(block => block.id === region.id)?.binding ?? "text"} block`} onFocus={() => setSelectedId(region.id)} onPointerDown={event => startDrag(event, region)} onPointerMove={drag} onPointerUp={event => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragRef.current = null; }} onClick={() => setSelectedId(region.id)} onKeyDown={event => {
            const step = event.shiftKey ? 10 : 1;
            const movement: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (movement[event.key]) { event.preventDefault(); setSelectedId(region.id); nudge(...movement[event.key]); }
          }} className={`absolute touch-none border bg-transparent text-left outline-offset-2 ${region.id === selectedId ? "z-10 cursor-move border-orange-500 bg-orange-400/5 ring-1 ring-orange-500" : "border-transparent hover:border-slate-400"}`} style={{ left: `${region.x / size.width * 100}%`, top: `${region.y / size.height * 100}%`, width: `${region.width / size.width * 100}%`, height: `${Math.max(region.height, 10) / size.height * 100}%` }}>{region.id === selectedId && <span aria-hidden="true" className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">↔</span>}</button>)}
        </div></div>
      </div>
    </div>
  </section>;
}
