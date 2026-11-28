import { type ContentArea, type LetterLayout } from "./layout-schema";

export function suggestedContentArea(layout: LetterLayout): ContentArea {
  const width = Math.min(...layout.pages.map(page => page.width)), height = Math.min(...layout.pages.map(page => page.height));
  return { left: Math.min(54, width * 0.1), right: Math.min(54, width * 0.1), top: Math.min(120, height * 0.22), bottom: Math.max(24, Math.min(72, height * 0.14)) };
}
// Background artwork stays intact. Only editable text and signature blocks move.
export function arrangeOnLetterhead(layout: LetterLayout, area: ContentArea, includeCompany = false): LetterLayout {
  const availableWidth = Math.min(...layout.pages.map(page => page.width)) - area.left - area.right;
  if (availableWidth < 24 || layout.pages.some(page => page.height - area.top - area.bottom < 30)) throw new Error("The letterhead margins leave too little room for content. Reduce the margins first.");
  const blocks = layout.blocks.filter(block => includeCompany || block.binding !== "companyName").map((block, index, source) => {
    const width = block.kind === "image" ? Math.min(block.width, availableWidth) : availableWidth;
    return { ...block, x: area.left, y: area.top, page: 0, width,
      height: block.kind === "image" ? block.height * width / block.width : block.height,
      afterId: index ? source[index - 1].id : null, flow: true,
      gap: index ? block.afterId ? block.gap : block.kind === "image" ? 24 : block.binding === "body" ? 24 : 16 : 0,
    };
  });
  return { ...layout, contentArea: area, blocks };
}
