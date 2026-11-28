import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import { defaultLetterLayout, layoutSchema, type LetterBlock, type LetterLayout, type PageSize } from "./layout-schema";
import { LETTER_LIMITS } from "./limits";
import type { ElementBox } from "./geometry";

export type DocumentFields = { title: string; companyName: string; recipientName: string; documentDate: string; body: string };
export type PlannedLine = { text: string; x: number; y: number; font: string; size: number; wordSpacing: number };
export type PlannedRegion = { id: string; page: number; x: number; y: number; width: number; height: number; kind: "text" | "image"; image: string | null; lines: PlannedLine[] };
export type DocumentPlan = { pages: PageSize[]; regions: PlannedRegion[]; layout: LetterLayout; backgrounds: (ElementBox & { page: number })[] };
export const fontNames: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica, "Helvetica-Bold": StandardFonts.HelveticaBold,
  "Helvetica-Italic": StandardFonts.HelveticaOblique, "Helvetica-BoldItalic": StandardFonts.HelveticaBoldOblique,
  Times: StandardFonts.TimesRoman, "Times-Bold": StandardFonts.TimesRomanBold,
  "Times-Italic": StandardFonts.TimesRomanItalic, "Times-BoldItalic": StandardFonts.TimesRomanBoldItalic,
  Courier: StandardFonts.Courier, "Courier-Bold": StandardFonts.CourierBold,
  "Courier-Italic": StandardFonts.CourierOblique, "Courier-BoldItalic": StandardFonts.CourierBoldOblique,
};
export const fontKey = (block: LetterBlock) => block.fontFamily + (block.bold || block.italic ? `-${block.bold ? "Bold" : ""}${block.italic ? "Italic" : ""}` : "");
export function decodeDataUrl(data: string) {
  return Uint8Array.from(atob(data.slice(data.indexOf(",") + 1)), character => character.charCodeAt(0));
}
export async function documentFonts(pdf: PDFDocument) {
  return Object.fromEntries(await Promise.all(Object.entries(fontNames).map(async ([key, name]) => [key, await pdf.embedFont(name)]))) as Record<string, PDFFont>;
}
function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const lines: { text: string; last: boolean }[] = [];
  for (const source of text.replace(/\r\n?/g, "\n").split("\n")) {
    let current = "";
    for (let word of source.split(/( +)/)) {
      if (current && font.widthOfTextAtSize(current + word, size) > width) {
        lines.push({ text: current.trimEnd(), last: false }); current = ""; word = word.trimStart();
      }
      for (const character of word) {
        if (font.widthOfTextAtSize(character, size) > width) throw new Error("A text box is too narrow for its font size. Widen it or reduce the font size.");
        if (font.widthOfTextAtSize(current + character, size) > width) { lines.push({ text: current, last: false }); current = ""; }
        current += character;
      }
    }
    lines.push({ text: current, last: true });
  }
  return lines;
}
function fittedText(text: string, font: PDFFont, block: LetterBlock) {
  const fits = (size: number) => {
    try { return wrapText(text, font, size, block.width).length * size * block.lineHeight <= block.height + 0.00001; }
    catch { return false; }
  };
  if (!fits(LETTER_LIMITS.blocks.minFontSize)) throw new Error("Text does not fit in this box at the minimum font size. Enlarge the box or switch to automatic text flow.");
  let low: number = LETTER_LIMITS.blocks.minFontSize, high = block.fontSize;
  if (fits(high)) low = high;
  else for (let index = 0; index < 24; index++) { const middle = (low + high) / 2; if (fits(middle)) low = middle; else high = middle; }
  const size = Math.floor(low * 1000000) / 1000000;
  return { size, lines: wrapText(text, font, size, block.width) };
}

export async function planDocument(fields: DocumentFields, rawLayout: unknown, fonts?: Record<string, PDFFont>): Promise<DocumentPlan> {
  const layout = rawLayout ? layoutSchema.parse(rawLayout) : defaultLetterLayout();
  const availableFonts = fonts ?? await documentFonts(await PDFDocument.create());
  const pages = layout.pages.map(page => ({ ...page }));
  const regions: PlannedRegion[] = [];
  const top = layout.contentArea?.top ?? layout.marginTop, bottom = layout.contentArea?.bottom ?? layout.marginBottom;
  const ends = new Map<string, { page: number; y: number }>();
  const ensurePage = (index: number) => {
    if (index >= LETTER_LIMITS.pages.generated) throw new Error("This document exceeds 100 pages. Shorten the content or increase the text area.");
    while (pages.length <= index) pages.push({ ...layout.pages[layout.pages.length - 1] });
    return pages[index];
  };
  const blockText = (block: LetterBlock) => block.binding === "custom" ? block.text : block.binding === "documentDate" ? `Date: ${fields.documentDate}` : block.binding === "recipientName" ? `To: ${fields.recipientName}` : fields[block.binding];
  for (const [blockIndex, block] of layout.blocks.entries()) {
    const preceding = block.afterId ? ends.get(block.afterId) : undefined;
    let page = preceding?.page ?? block.page;
    let y = preceding ? preceding.y + block.gap : block.y;
    let size = ensurePage(page);
    const advance = (height: number) => {
      if (height > size.height - top - bottom && block.flow) throw new Error("A block is taller than the printable page. Reduce its size or margins.");
      if (y + height > size.height - bottom) {
        if (!block.flow) throw new Error("A fixed block extends below the page. Move it, resize it, or enable automatic page flow.");
        size = ensurePage(++page); y = top;
      }
      if (layout.contentArea && (block.x < layout.contentArea.left - 0.1 || y < top - 0.1 || block.x + block.width > size.width - layout.contentArea.right + 0.1)) throw new Error("A block is outside the letterhead's printable area. Use Arrange letter or move it inside the green guides.");
      if (block.x + block.width > size.width + 0.1) throw new Error(`The ${block.binding === "custom" ? "selected" : block.binding} block extends past the page. Move or resize it.`);
    };
    if (block.kind === "image") {
      let reserve = block.height;
      const label = layout.blocks[blockIndex + 1];
      if (label?.kind === "text" && label.afterId === block.id) {
        const labelLines = wrapText(blockText(label), availableFonts[fontKey(label)], label.fontSize, label.width);
        const together = block.height + label.gap + (label.textSizing === "FIT" ? label.height : labelLines.length * label.fontSize * label.lineHeight);
        if ((label.textSizing === "FIT" || labelLines.length <= 6) && together <= size.height - top - bottom) reserve = together;
      }
      advance(reserve);
      regions.push({ id: block.id, page, x: block.x, y, width: block.width, height: block.height, kind: "image", image: block.image, lines: [] });
      ends.set(block.id, { page, y: y + block.height }); continue;
    }
    const text = blockText(block);
    const font = availableFonts[fontKey(block)];
    if (block.textSizing === "FIT") {
      const fitted = fittedText(text, font, block);
      advance(block.height);
      const region: PlannedRegion = { id: block.id, page, x: block.x, y, width: block.width, height: block.height, kind: "text", image: null, lines: [] };
      for (const [index, line] of fitted.lines.entries()) {
        const used = font.widthOfTextAtSize(line.text, fitted.size), spaces = (line.text.match(/ /g) ?? []).length;
        const x = block.x + (block.align === "center" ? (block.width - used) / 2 : block.align === "right" ? block.width - used : 0);
        region.lines.push({ text: line.text, x, y: y + index * fitted.size * block.lineHeight, size: fitted.size, font: fontKey(block), wordSpacing: block.align === "justify" && !line.last && spaces ? (block.width - used) / spaces : 0 });
      }
      regions.push(region); ends.set(block.id, { page, y: y + block.height }); continue;
    }
    const step = block.fontSize * block.lineHeight;
    const lines = wrapText(text, font, block.fontSize, block.width);
    let region: PlannedRegion | undefined;
    // Keep short following blocks, including signatures, together on a page.
    if (block.afterId && block.binding !== "body" && lines.length <= 6 && lines.length * step <= size.height - top - bottom) advance(lines.length * step);
    for (const line of lines) {
      advance(step);
      if (!region || region.page !== page) {
        region = { id: block.id, page, x: block.x, y, width: block.width, height: 0, kind: "text", image: null, lines: [] }; regions.push(region);
      }
      const usedWidth = font.widthOfTextAtSize(line.text, block.fontSize);
      const x = block.x + (block.align === "center" ? (block.width - usedWidth) / 2 : block.align === "right" ? block.width - usedWidth : 0);
      const spaces = (line.text.match(/ /g) ?? []).length;
      const wordSpacing = block.align === "justify" && !line.last && spaces ? (block.width - usedWidth) / spaces : 0;
      region.lines.push({ text: line.text, x, y, size: block.fontSize, font: fontKey(block), wordSpacing });
      y += step; region.height += step;
    }
    ends.set(block.id, { page, y });
  }
  return { pages, regions, layout, backgrounds: [] };
}
