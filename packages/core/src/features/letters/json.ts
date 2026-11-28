import { z } from "zod";
import { type LetterContent } from "./content";
import { defaultLetterLayout, latinText, layoutSchema } from "./layout-schema";
import { LETTER_LIMITS } from "./limits";

const text = LETTER_LIMITS.text;
// JSON imports are editor drafts: empty fields are allowed until Save draft.
const draftPatch = z.object({
  title: latinText(text.title), companyName: latinText(text.companyName), recipientName: latinText(text.recipientName),
  recipientEmail: z.union([z.email().max(text.recipientEmail), z.literal("")]),
  recipientPhone: z.string().regex(/^(\+?[1-9]\d{6,14})?$/), documentDate: z.union([z.iso.date(), z.literal("")]),
  body: latinText(text.body), emailSubject: latinText(text.emailSubject), emailBody: latinText(text.emailBody), whatsappText: latinText(text.whatsappText),
  layout: layoutSchema.nullable(),
}).strict().partial();
const envelope = z.object({ format: z.literal("hexvault-letter"), version: z.literal(1), document: draftPatch, templateName: z.string().trim().min(1).max(text.templateName).optional(), limits: z.unknown().optional() }).strict();

export function parseLetterJson(source: string, current: LetterContent): { content: LetterContent; templateName?: string } {
  if (source.length > LETTER_LIMITS.uploads.requestJsonCharacters) throw new Error("The JSON is too large. Use a file smaller than 8.5 MB.");
  let raw: unknown;
  try { raw = JSON.parse(source); } catch { throw new Error("The JSON is not valid. Check commas, quotes, and brackets."); }
  try {
    const wrapped = typeof raw === "object" && raw !== null && ("format" in raw || "document" in raw || "version" in raw);
    const parsed = wrapped ? envelope.parse(raw) : { document: draftPatch.parse(raw), templateName: undefined };
    if (!Object.keys(parsed.document).length) throw new Error("Include at least one document field, such as title, body, or layout.");
    return { content: { ...current, ...parsed.document }, templateName: parsed.templateName };
  } catch (error) {
    if (error instanceof z.ZodError) throw new Error(error.issues.slice(0, 4).map(issue => `${issue.path.join(".") || "JSON"}: ${issue.message}`).join("; "));
    throw error;
  }
}
export function exportLetterJson(content: LetterContent, templateName?: string) {
  return JSON.stringify({ format: "hexvault-letter", version: 1, ...(templateName?.trim() ? { templateName: templateName.trim() } : {}), document: { ...content, layout: content.layout ?? defaultLetterLayout() }, limits: LETTER_LIMITS }, null, 2);
}
export function sampleLetterJson(current: LetterContent) {
  const example = (value: string, fallback: string) => (value || fallback).replace(/\{\{[^{}]*\}\}/g, "Example value");
  return exportLetterJson({ ...current,
    title: example(current.title, "Certificate of appreciation"), companyName: example(current.companyName, "HEXVAULT"),
    recipientName: example(current.recipientName, "Alex Example"), documentDate: current.documentDate || "2026-11-28",
    body: example(current.body, "This certificate recognizes Alex Example for their contribution to the project.\n\nThank you for your dedication and professionalism."),
    emailSubject: example(current.emailSubject, "Your approved certificate"), emailBody: example(current.emailBody, "Hello Alex,\n\nPlease find your approved certificate attached."),
    whatsappText: example(current.whatsappText ?? "", "Hello Alex, please find your approved certificate attached."),
    layout: current.layout ? { ...current.layout, blocks: current.layout.blocks.map(block => ({ ...block, text: example(block.text, "") })) } : defaultLetterLayout(),
  }, "My custom template");
}
