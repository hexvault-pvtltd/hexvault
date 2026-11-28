"use client";

import { arrangeOnLetterhead, suggestedContentArea } from "@core/features/letters/letterhead";
import { type ContentArea, type LetterLayout } from "@core/features/letters/layout-schema";

const field = "mt-1 block w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-sm";
export function LetterheadSetup({ layout, disabled, onChange, onError }: {
  layout: LetterLayout; disabled: boolean; onChange: (layout: LetterLayout) => void; onError: (message: string) => void;
}) {
  const area = layout.contentArea ?? suggestedContentArea(layout);
  function arrange() {
    try { onChange(arrangeOnLetterhead(layout, area)); onError(""); }
    catch (error) { onError(error instanceof Error ? error.message : "Unable to arrange this letter."); }
  }
  function changeMargin(key: keyof ContentArea, mm: number) {
    const points = mm * 72 / 25.4;
    if (!Number.isFinite(points) || points < (key === "top" ? 12 : key === "bottom" ? 24 : 0) || points > 1000) return;
    onChange({ ...layout, contentArea: { ...area, [key]: points } });
  }
  return <fieldset disabled={disabled} className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
    <div><h4 className="text-sm font-semibold text-emerald-950">Letterhead and printable area</h4><p className="mt-1 text-xs leading-5 text-emerald-900">Upload your blank letterhead above, then reserve space for its header, footer, and borders. Arrange letter places the text and signatures inside that area. You can still adjust each block in the preview.</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(["top", "bottom", "left", "right"] as const).map(key => <label key={key} className="text-xs font-medium text-emerald-950">{key === "top" ? "Header space" : key === "bottom" ? "Footer space" : `${key === "left" ? "Left" : "Right"} border`} (mm)<input aria-label={`Letterhead ${key} margin (mm)`} className={field} type="number" step="any" min={0} max={353} value={Math.round(area[key] / 72 * 25.4 * 10) / 10} onChange={event => changeMargin(key, Number(event.target.value))}/></label>)}</div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={arrange} className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Arrange letter inside letterhead</button>{layout.contentArea && <button type="button" onClick={() => { const next = { ...layout }; delete next.contentArea; onChange(next); }} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium">Disable printable-area guides</button>}
      {layout.background && <label className="flex items-center gap-2 text-xs text-emerald-950"><input type="checkbox" checked={layout.backgroundMode !== "FIRST"} onChange={event => onChange({ ...layout, backgroundMode: event.target.checked ? "ALL" : "FIRST" })}/>Repeat letterhead on every page</label>}
    </div>
    <p className="text-xs leading-5 text-emerald-900">Long text continues inside these margins on the next page. Following signatures and their name/title move down together. Text already printed in the uploaded PDF or image stays part of the background.</p>
  </fieldset>;
}
