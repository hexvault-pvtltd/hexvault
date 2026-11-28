"use client";

import { useState } from "react";
import type { ElementBox } from "@core/features/letters/geometry";

function ExactNumber({ value, min, max, label, onChange }: { value: number; min: number; max: number; label: string; onChange: (value: number) => void }) {
  const [editing, setEditing] = useState(false), [text, setText] = useState("");
  const display = String(Math.round(value * 1000000) / 1000000);
  return <label className="text-xs">{label}<input aria-label={label} type="number" step="any" min={Math.floor(Math.min(min, value) * 1000000) / 1000000} max={Math.ceil(Math.max(max, value) * 1000000) / 1000000} value={editing ? text : display}
    onFocus={() => { setText(display); setEditing(true); }} onBlur={() => setEditing(false)}
    onChange={event => { setText(event.target.value); const number = Number(event.target.value); if (event.target.value.trim() && Number.isFinite(number) && number >= min && number <= max) onChange(number); }}
    className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs"/></label>;
}
export function LetterGeometryControls({ box, onChange, keepRatio = false, onKeepRatio, maxHeight = 1500, label = "Element" }: {
  box: ElementBox; onChange: (patch: Partial<ElementBox>) => void; keepRatio?: boolean; onKeepRatio?: (keep: boolean) => void; maxHeight?: number; label?: string;
}) {
  const [unit, setUnit] = useState<"pt" | "mm">("pt");
  const factor = unit === "mm" ? 25.4 / 72 : 1;
  function change(key: keyof ElementBox, number: number) {
    const value = number / factor;
    if (keepRatio && (key === "width" || key === "height")) {
      const width = key === "width" ? value : box.width * value / box.height;
      const height = key === "height" ? value : box.height * value / box.width;
      if (width < 12 || width > 3000 || height < 8 || height > maxHeight) return;
      onChange({ width, height });
    } else onChange({ [key]: value });
  }
  return <div className="space-y-3"><label className="block text-xs font-semibold">{label} position and size<select aria-label={`${label} measurement units`} value={unit} onChange={event => setUnit(event.target.value as "pt" | "mm")} className="ml-2 rounded-md border bg-white px-2 py-1"><option value="pt">Points</option><option value="mm">Millimeters</option></select></label>
    <div className="grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map(key => <ExactNumber key={`${key}-${unit}`} label={`${label} ${key === "x" ? "left" : key === "y" ? "top" : key} (${unit})`} value={box[key] * factor} min={(key === "width" ? 12 : key === "height" ? 8 : 0) * factor} max={(key === "height" ? maxHeight : 3000) * factor} onChange={number => change(key, number)}/>)}</div>
    {onKeepRatio && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={keepRatio} onChange={event => onKeepRatio(event.target.checked)}/>Keep original proportions</label>}
  </div>;
}
