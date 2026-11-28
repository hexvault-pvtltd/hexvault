import { z } from "zod";
import { layoutSchema } from "./layout-schema";

// The bundled PDF fonts cover Windows Latin text. Reject unsupported characters
// before review so the approved copy can always be rendered without data loss.
const printable = (max: number, min = 1) => z.string().trim().min(min).max(max).refine(value =>
  !/[^\u0020-\u007e\u00a0-\u00ff\u20ac\u2018\u2019\u201c\u201d\u2013\u2014\n\r]/u.test(value),
"Use Latin text for this PDF; other writing systems are not supported yet.");
export const letterContentSchema = z.object({
  title: printable(120), companyName: printable(120), recipientName: printable(120),
  recipientEmail: z.union([z.email().max(254), z.literal("")]), documentDate: z.iso.date(),
  body: printable(16000), emailSubject: printable(180), emailBody: printable(8000, 10),
  recipientPhone: z.string().regex(/^(\+?[1-9]\d{6,14})?$/, "Use an international phone number, for example +919876543210.").optional(),
  whatsappText: printable(8000).optional(), layout: layoutSchema.nullable().optional(),
}).strict().refine(value => !Object.values(value).some(text => typeof text === "string" && /\{\{|\}\}/.test(text)) &&
  !value.layout?.blocks.some(block => /\{\{|\}\}/.test(block.text)), {
  message: "Fill or remove the remaining {{placeholders}} before saving. Custom details are optional when inserting a template.",
});
export type LetterContent = z.infer<typeof letterContentSchema>;
export const templateSchema = z.object({ name: printable(100), title: printable(120), body: printable(12000), emailSubject: printable(180), emailBody: printable(6000, 10), whatsappText: printable(8000).optional(), layout: layoutSchema.nullable().optional() }).strict();
export const placeholderNames = ["candidate_name", "date", "job_title", "start_date", "end_date", "company_name", "project_name", "custom_details"] as const;
export function fillTemplate(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (original, key) => key === "custom_details" ? values[key]?.trim() ?? "" : values[key]?.trim() || original).replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
}
export function unresolvedPlaceholders(value: Pick<LetterContent, "title" | "body" | "emailSubject" | "emailBody" | "whatsappText" | "layout">) {
  const texts = [value.title, value.body, value.emailSubject, value.emailBody, value.whatsappText ?? "", ...(value.layout?.blocks.map(block => block.text) ?? [])];
  return [...new Set(texts.flatMap(text => [...text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(match => match[1].trim())))];
}
export function clearOptionalDetails(value: LetterContent): LetterContent {
  const clear = (text: string) => text.replace(/\{\{\s*custom_details\s*\}\}/g, "").replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
  return { ...value, title: clear(value.title), body: clear(value.body), emailSubject: clear(value.emailSubject), emailBody: clear(value.emailBody), whatsappText: value.whatsappText ? clear(value.whatsappText) : value.whatsappText,
    layout: value.layout ? { ...value.layout, blocks: value.layout.blocks.map(block => ({ ...block, text: clear(block.text) })) } : value.layout };
}
export const starterTemplates = [
  { id: "offer", name: "Offer letter", title: "Offer of employment", body: "Dear {{candidate_name}},\n\nWe are pleased to offer you the position of {{job_title}} at {{company_name}}, starting on {{start_date}}.\n\n{{custom_details}}\n\nPlease contact Human Resources to confirm your acceptance.\n\nSincerely,\nHuman Resources\n{{company_name}}", emailSubject: "Your offer letter from {{company_name}}", emailBody: "Dear {{candidate_name}},\n\nPlease find your approved offer letter attached.\n\nRegards,\nHuman Resources" },
  { id: "certificate", name: "Service certificate", title: "Certificate of service", body: "This is to certify that {{candidate_name}} served as {{job_title}} at {{company_name}} from {{start_date}} to {{end_date}}.\n\n{{custom_details}}\n\nHuman Resources\n{{company_name}}", emailSubject: "Your certificate from {{company_name}}", emailBody: "Dear {{candidate_name}},\n\nPlease find your approved service certificate attached.\n\nRegards,\nHuman Resources" },
  { id: "project", name: "Project completion", title: "Project completion certificate", body: "This certifies that {{candidate_name}} successfully completed their contribution to {{project_name}} at {{company_name}} on {{date}}.\n\n{{custom_details}}\n\n{{company_name}}", emailSubject: "Project completion certificate - {{project_name}}", emailBody: "Dear {{candidate_name}},\n\nPlease find your approved project completion certificate attached.\n\nRegards,\nHuman Resources" },
];
