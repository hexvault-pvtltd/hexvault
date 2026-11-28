import { z } from "zod";

export const latinText = (max: number, min = 0) => z.string().max(max).min(min).refine(value =>
  !/[^\u0020-\u007e\u00a0-\u00ff\u20ac\u2018\u2019\u201c\u201d\u2013\u2014\n\r]/u.test(value),
  "PDF text currently supports Latin characters.");
const imageData = z.string().max(2800000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/);
export const pageSizeSchema = z.object({ width: z.number().min(72).max(3000), height: z.number().min(72).max(3000) }).strict();
export const contentAreaSchema = z.object({ left: z.number().min(0).max(1000), right: z.number().min(0).max(1000), top: z.number().min(12).max(1000), bottom: z.number().min(24).max(1000) }).strict();
export const blockSchema = z.object({
  id: z.string().min(1).max(80), kind: z.enum(["text", "image"]),
  binding: z.enum(["title", "body", "companyName", "recipientName", "documentDate", "custom"]),
  text: latinText(16000), image: imageData.nullable(),
  page: z.number().int().min(0).max(99), x: z.number().min(0).max(3000), y: z.number().min(0).max(3000),
  width: z.number().min(12).max(3000), height: z.number().min(8).max(1500),
  fontSize: z.number().min(6).max(120), fontFamily: z.enum(["Helvetica", "Times", "Courier"]),
  bold: z.boolean(), italic: z.boolean(), align: z.enum(["left", "center", "right", "justify"]),
  lineHeight: z.number().min(1).max(2.5), flow: z.boolean(),
  afterId: z.string().max(80).nullable(), gap: z.number().min(0).max(300),
}).strict();
export const layoutSchema = z.object({
  version: z.literal(1), pages: z.array(pageSizeSchema).min(1).max(30),
  marginTop: z.number().min(12).max(250), marginBottom: z.number().min(24).max(250),
  contentArea: contentAreaSchema.optional(), backgroundMode: z.enum(["ALL", "FIRST"]).optional(),
  background: z.object({ name: z.string().max(160), kind: z.enum(["pdf", "png", "jpeg"]), data: z.string().max(4200000).regex(/^data:(application\/pdf|image\/png|image\/jpeg);base64,[A-Za-z0-9+/=]+$/) }).strict().nullable(),
  blocks: z.array(blockSchema).max(80),
}).strict().superRefine((layout, context) => {
  const ids = new Set<string>();
  for (const [index, block] of layout.blocks.entries()) {
    if (ids.has(block.id)) context.addIssue({ code: "custom", path: ["blocks", index, "id"], message: "Block IDs must be unique." });
    if (block.afterId && !ids.has(block.afterId)) context.addIssue({ code: "custom", path: ["blocks", index, "afterId"], message: "A following block must refer to an earlier block." });
    ids.add(block.id);
    if (block.kind === "image" && !block.image) context.addIssue({ code: "custom", path: ["blocks", index, "image"], message: "Upload an image for this block." });
  }
  if (JSON.stringify(layout).length > 7500000) context.addIssue({ code: "custom", message: "This layout is too large. Use smaller template and signature images." });
  if (!layout.contentArea) for (const page of layout.pages) if (page.height < layout.marginTop + layout.marginBottom + 30) context.addIssue({ code: "custom", message: "Page height must leave room between the top and bottom margins." });
  if (layout.contentArea) for (const page of layout.pages) {
    if (page.width < layout.contentArea.left + layout.contentArea.right + 24 || page.height < layout.contentArea.top + layout.contentArea.bottom + 30) context.addIssue({ code: "custom", path: ["contentArea"], message: "The letterhead margins leave too little room for content. Reduce them or use a larger page." });
  }
});
export type LetterLayout = z.infer<typeof layoutSchema>;
export type LetterBlock = z.infer<typeof blockSchema>;
export type PageSize = z.infer<typeof pageSizeSchema>;
export type ContentArea = z.infer<typeof contentAreaSchema>;
export function newTextBlock(id: string, overrides: Partial<LetterBlock> = {}): LetterBlock {
  return { id, kind: "text", binding: "custom", text: "New text", image: null, page: 0, x: 54, y: 120, width: 487, height: 60, fontSize: 11, fontFamily: "Helvetica", bold: false, italic: false, align: "left", lineHeight: 1.5, flow: true, afterId: null, gap: 16, ...overrides };
}
export function defaultLetterLayout(): LetterLayout {
  return { version: 1, pages: [{ width: 595.28, height: 841.89 }], marginTop: 54, marginBottom: 64, background: null, blocks: [
    newTextBlock("company", { binding: "companyName", y: 36, fontSize: 11, bold: true, flow: false }),
    newTextBlock("title", { binding: "title", y: 78, fontSize: 21, bold: true }),
    newTextBlock("date", { binding: "documentDate", afterId: "title", gap: 20, fontSize: 10 }),
    newTextBlock("recipient", { binding: "recipientName", afterId: "date", gap: 8, fontSize: 10 }),
    newTextBlock("body", { binding: "body", afterId: "recipient", gap: 28 }),
    newTextBlock("signature", { text: "Authorized signatory\nHuman Resources", afterId: "body", gap: 28 }),
  ] };
}
