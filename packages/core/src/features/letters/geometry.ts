export type ElementBox = { x: number; y: number; width: number; height: number };
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type BoxBounds = { left: number; top: number; right: number; bottom: number };
export function resizeElementBox(box: ElementBox, handle: ResizeHandle, dx: number, dy: number, bounds: BoxBounds, lockRatio: boolean): ElementBox {
  const west = handle.includes("w"), east = handle.includes("e"), north = handle.includes("n"), south = handle.includes("s");
  let width = box.width + (east ? dx : west ? -dx : 0), height = box.height + (south ? dy : north ? -dy : 0);
  const maxWidth = west ? box.x + box.width - bounds.left : bounds.right - box.x;
  const maxHeight = north ? box.y + box.height - bounds.top : bounds.bottom - box.y;
  if (lockRatio) {
    const ratio = box.width / box.height;
    const scale = west || east ? north || south ? Math.abs(width / box.width - 1) > Math.abs(height / box.height - 1) ? width / box.width : height / box.height : width / box.width : height / box.height;
    width = box.width * scale; height = width / ratio;
    const boundedScale = Math.min(Math.max(scale, 12 / box.width, 8 / box.height), maxWidth / box.width, maxHeight / box.height, 3000 / box.width, 1500 / box.height);
    width = box.width * boundedScale; height = box.height * boundedScale;
  } else {
    width = Math.max(12, Math.min(width, maxWidth, 3000)); height = Math.max(8, Math.min(height, maxHeight, 1500));
  }
  return { x: west ? box.x + box.width - width : box.x, y: north ? box.y + box.height - height : box.y, width, height };
}
