"use client";

import type { PointerEvent } from "react";
import type { ElementBox, ResizeHandle } from "@core/features/letters/geometry";
import type { PageSize } from "@core/features/letters/layout-schema";

const handles: { name: string; handle: ResizeHandle; left: string; top: string; cursor: string }[] = [
  { name: "top left", handle: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
  { name: "top", handle: "n", left: "50%", top: "0%", cursor: "ns-resize" },
  { name: "top right", handle: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
  { name: "right", handle: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { name: "bottom right", handle: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { name: "bottom", handle: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { name: "bottom left", handle: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
  { name: "left", handle: "w", left: "0%", top: "50%", cursor: "ew-resize" },
];
export function LetterBlockOverlay({ box, size, selected, disabled, label, onSelect, onMoveStart, onMove, onEnd, onMoveKey, onResizeStart, onResize, onResizeKey }: {
  box: ElementBox; size: PageSize; selected: boolean; disabled: boolean; label: string; onSelect: () => void;
  onMoveStart: (event: PointerEvent<HTMLButtonElement>) => void; onMove: (event: PointerEvent<HTMLButtonElement>) => void; onEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onMoveKey: (dx: number, dy: number) => void;
  onResizeStart: (event: PointerEvent<HTMLButtonElement>, handle: ResizeHandle) => void; onResize: (event: PointerEvent<HTMLButtonElement>) => void;
  onResizeKey: (handle: ResizeHandle, dx: number, dy: number, shift: boolean) => void;
}) {
  const movement: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  return <div className={`absolute ${selected ? "z-10" : ""}`} style={{ left: `${box.x / size.width * 100}%`, top: `${box.y / size.height * 100}%`, width: `${box.width / size.width * 100}%`, height: `${Math.max(box.height, 10) / size.height * 100}%` }}>
    <button type="button" disabled={disabled} aria-label={`Select ${label} block`} onFocus={onSelect} onClick={onSelect} onPointerDown={onMoveStart} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}
      onKeyDown={event => { const delta = movement[event.key]; if (delta) { event.preventDefault(); const step = event.shiftKey ? 10 : 1; onMoveKey(delta[0] * step, delta[1] * step); } }}
      className={`absolute inset-0 h-full w-full touch-none border bg-transparent text-left outline-offset-2 ${selected ? "cursor-move border-orange-500 bg-orange-400/5 ring-1 ring-orange-500" : "border-transparent hover:border-slate-400"}`}>
      {selected && <span aria-hidden="true" className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-orange-500 px-1 text-xs text-white">↔</span>}
    </button>
    {selected && !disabled && handles.map(item => <button key={item.handle} type="button" aria-label={`Resize ${item.name}`} title={`Resize ${item.name}; hold Shift to keep proportions`} className="absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 touch-none rounded-sm border border-white bg-orange-600 shadow-sm" style={{ left: item.left, top: item.top, cursor: item.cursor }}
      onPointerDown={event => onResizeStart(event, item.handle)} onPointerMove={onResize} onPointerUp={onEnd} onPointerCancel={onEnd}
      onKeyDown={event => { const delta = movement[event.key]; if (delta) { event.preventDefault(); const step = event.altKey ? 10 : 1; onResizeKey(item.handle, delta[0] * step, delta[1] * step, event.shiftKey); } }}/>) }
  </div>;
}
