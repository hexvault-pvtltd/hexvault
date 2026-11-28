import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import type { GeneratedLetter } from "@prisma/client";
import { db } from "../packages/core/src/lib/db";
import { clearOptionalDetails, letterContentSchema, fillTemplate, unresolvedPlaceholders, type LetterContent } from "../packages/core/src/features/letters/content";
import { arrangeOnLetterhead, suggestedContentArea } from "../packages/core/src/features/letters/letterhead";
import { defaultLetterLayout, layoutSchema, newTextBlock } from "../packages/core/src/features/letters/layout-schema";
import { planDocument } from "../packages/core/src/features/letters/layout";
import { nextLetterStatus, assertLetterAccess } from "../packages/core/src/features/letters/policy";
import { changeLetter, editLetter, prepareLetterShare } from "../packages/core/src/features/letters/service";
import { buildLetterPdf, renderLetterPdf } from "../packages/core/src/features/letters/pdf";
import { composeLinks } from "../packages/core/src/features/letters/sharing";

const content: LetterContent = { title: "Project completion certificate", companyName: "HEXVAULT", recipientName: "Alex Candidate", recipientEmail: "alex@example.com", recipientPhone: "+919876543210", documentDate: "2026-11-28", body: "This certifies that Alex Candidate successfully completed their contribution to the workforce project.\n\nTheir work covered design, implementation, and testing.", emailSubject: "Your project completion certificate", emailBody: "Dear Alex,\n\nPlease find your approved certificate attached.\n\nRegards,\nHuman Resources", whatsappText: "Hello Alex, please find your certificate attached." };
const hr = { id: "hr", roles: ["HR"] }, owner = { id: "owner", roles: ["OWNER"] }, manager = { id: "manager", roles: ["TEAM_LEAD"] };
function database(status = "DRAFT") {
  let row: GeneratedLetter = { ...content, recipientPhone: content.recipientPhone!, whatsappText: content.whatsappText!, layout: null, id: "00000000-0000-4000-8000-000000000001", createdBy: hr.id, status, revision: 1, approvedBy: status === "APPROVED" ? owner.id : null, approvedAt: status === "APPROVED" ? new Date() : null, feedback: null, sentBy: null, sentAt: null, deliveryMethod: null, createdAt: new Date(), updatedAt: new Date() };
  const audit: { data: { action: string; metadata?: unknown } }[] = [];
  const client = {
    generatedLetter: {
      findUnique: async () => ({ ...row }), findUniqueOrThrow: async () => ({ ...row }),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (!Object.entries(where).every(([key, value]) => row[key as keyof GeneratedLetter] === value)) return { count: 0 };
        row = { ...row, ...data, revision: typeof data.revision === "object" ? row.revision + 1 : row.revision } as GeneratedLetter;
        return { count: 1 };
      },
    }, auditLog: { create: async (data: { data: { action: string } }) => { audit.push(data); } },
    $transaction: async <T>(run: (tx: unknown) => Promise<T>) => run(client),
  };
  return { client: client as unknown as typeof db, row: () => row, audit, bump: () => { row.revision++; } };
}
test("only owner can approve and only HR can prepare sharing after approval", () => {
  for (const actor of [hr, manager]) assert.throws(() => nextLetterStatus(actor, "PENDING_APPROVAL", "APPROVE"), /Only the owner/);
  assert.throws(() => nextLetterStatus(owner, "APPROVED", "SHARE"), /Only HR/);
  for (const status of ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED"]) assert.throws(() => nextLetterStatus(hr, status, "SHARE"), /Owner approval/);
  assert.throws(() => nextLetterStatus(hr, "APPROVED", "SEND"), /Unknown letter action/);
  assert.throws(() => assertLetterAccess(manager, { createdBy: hr.id }), /own letters/);
});
test("approval and owner feedback protect the current revision", async () => {
  const state = database();
  await changeLetter(hr, state.row().id, 1, "SUBMIT", undefined, state.client);
  await assert.rejects(changeLetter(owner, state.row().id, 1, "APPROVE", undefined, state.client), /changed/);
  await changeLetter(owner, state.row().id, 2, "RETURN", "Correct the date", state.client);
  assert.equal(state.row().feedback, "Correct the date");
  await changeLetter(hr, state.row().id, 3, "SUBMIT", undefined, state.client);
  await changeLetter(owner, state.row().id, 4, "APPROVE", undefined, state.client);
  assert.equal(state.row().approvedBy, owner.id);
});
test("changing layout, signature, WhatsApp copy, or recipient clears approval", async () => {
  const state = database("APPROVED");
  const layout = defaultLetterLayout(); layout.blocks.find(block => block.id === "signature")!.text = "Jane Example\nProject manager";
  await editLetter(hr, state.row().id, 1, { ...content, layout, whatsappText: "An updated approved message.", recipientPhone: "+441234567890" }, state.client);
  assert.equal(state.row().status, "DRAFT"); assert.equal(state.row().approvedBy, null); assert.equal(state.row().approvedAt, null);
  await assert.rejects(prepareLetterShare(hr, state.row().id, 2, "WHATSAPP", state.client), /Owner approval/);
});
test("sharing returns a PDF without contacting a mail provider or marking the letter sent", async () => {
  const state = database("APPROVED"), originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("No email provider should be called."); };
  try {
    const result = await prepareLetterShare(hr, state.row().id, 1, "GMAIL", state.client);
    assert.equal(Buffer.from(result.pdf).subarray(0, 4).toString(), "%PDF");
    assert.equal(state.row().status, "APPROVED"); assert.equal(state.row().sentAt, null);
    assert.equal(state.audit.at(-1)?.data.action, "letter.share_prepared");
    state.bump();
    await assert.rejects(prepareLetterShare(hr, state.row().id, 1, "GMAIL", state.client), /changed/);
  } finally { globalThis.fetch = originalFetch; }
});
test("composer links encode messages and recipients without attachments or credentials", () => {
  const links = composeLinks({ recipientEmail: "alex+hr@example.com", recipientPhone: "+919876543210", subject: "Certificate & offer", emailText: "Line one\nLine two & three", whatsappText: "Hello Alex & team 👋" });
  const gmail = new URL(links.gmail), whatsapp = new URL(links.whatsapp);
  assert.equal(gmail.searchParams.get("to"), "alex+hr@example.com");
  assert.equal(gmail.searchParams.get("body"), "Line one\nLine two & three");
  assert.equal(whatsapp.pathname, "/919876543210"); assert.equal(whatsapp.searchParams.get("text"), "Hello Alex & team 👋");
  assert(links.email.startsWith("mailto:alex%2Bhr%40example.com?"));
});
test("placeholders and malformed geometry cannot enter an approved letter", async () => {
  assert.equal(fillTemplate("Dear {{candidate_name}}", { candidate_name: "Alex" }), "Dear Alex");
  const layout = defaultLetterLayout(); layout.blocks[0].text = "{{missing_value}}";
  assert(!letterContentSchema.safeParse({ ...content, layout }).success);
  layout.blocks[0].text = "Company"; layout.blocks[0].afterId = "signature";
  assert(!layoutSchema.safeParse(layout).success);
  const overflow = defaultLetterLayout(); overflow.blocks[0].width = 2000;
  await assert.rejects(renderLetterPdf({ ...content, id: "overflow", layout: overflow }, false), /past the page/);
});
test("empty custom details are omitted while required template fields remain visible", () => {
  assert.equal(fillTemplate("Dear {{candidate_name}},\n\n{{custom_details}}\n\nWelcome.", { candidate_name: "Alex" }), "Dear Alex,\n\nWelcome.");
  assert.equal(fillTemplate("Role: {{job_title}}", {}), "Role: {{job_title}}");
  const cleaned = clearOptionalDetails({ ...content, body: "Hello Alex,\n\n{{custom_details}}\n\nYour position is {{job_title}}." });
  assert(!cleaned.body.includes("custom_details"));
  assert.deepEqual(unresolvedPlaceholders(cleaned), ["job_title"]);
});
test("letterhead arrangement reserves header, footer, and borders across every page", async () => {
  const layout = defaultLetterLayout();
  const area = { top: 145, bottom: 95, left: 65, right: 75 };
  const arranged = arrangeOnLetterhead(layout, area);
  assert(!arranged.blocks.some(block => block.binding === "companyName"));
  assert.equal(arranged.blocks[0].y, area.top);
  const fields = { ...content, body: "An extended letter with duties, terms, and candidate information. ".repeat(200) };
  const plan = await planDocument(fields, arranged);
  assert(plan.pages.length > 1);
  for (const region of plan.regions) {
    assert(region.y >= area.top - 0.1);
    assert(region.y + region.height <= plan.pages[region.page].height - area.bottom + 0.1);
    assert(region.x >= area.left);
    assert(region.x + region.width <= plan.pages[region.page].width - area.right + 0.1);
  }
  const body = plan.regions.filter(region => region.id === "body").at(-1)!;
  const signature = plan.regions.find(region => region.id === "signature")!;
  assert(signature.page >= body.page);
  if (signature.page === body.page) assert(signature.y >= body.y + body.height);
});
test("letterhead areas validate and guide manual positioning", async () => {
  const layout = arrangeOnLetterhead(defaultLetterLayout(), { top: 120, bottom: 75, left: 54, right: 54 });
  layout.blocks[0].y = 30;
  await assert.rejects(planDocument(content, layout), /printable area/);
  assert.throws(() => arrangeOnLetterhead(layout, { top: 800, bottom: 100, left: 54, right: 54 }), /too little room/);
  assert.equal(layoutSchema.safeParse({ ...layout, contentArea: { top: 800, bottom: 100, left: 54, right: 54 } }).success, false);
  const suggested = suggestedContentArea({ ...layout, pages: [{ width: 420, height: 595 }] });
  assert(suggested.left + suggested.right < 420); assert(suggested.top + suggested.bottom < 595);
});
test("letterhead PDF keeps the uploaded artwork and reserves space for a long letter", async () => {
  await mkdir(".cache/letter-pdfs", { recursive: true });
  const template = await PDFDocument.create(), page = template.addPage([595.28, 841.89]);
  page.drawText("HEXVAULT", { x: 54, y: 790, size: 22, color: rgb(0.12, 0.17, 0.23) });
  page.drawText("LETTERHEAD / WORKFORCE OPERATIONS", { x: 54, y: 770, size: 9 });
  page.drawLine({ start: { x: 54, y: 755 }, end: { x: 541, y: 755 }, thickness: 2, color: rgb(0.95, 0.38, 0.15) });
  page.drawLine({ start: { x: 54, y: 55 }, end: { x: 541, y: 55 }, thickness: 1, color: rgb(0.6, 0.65, 0.7) });
  page.drawText("HEXVAULT / Company correspondence", { x: 54, y: 38, size: 9 });
  const bytes = await template.save();
  await writeFile(".cache/letter-pdfs/letterhead-template.pdf", bytes);
  const original = defaultLetterLayout();
  original.background = { name: "letterhead-template.pdf", kind: "pdf", data: `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}` };
  const layout = arrangeOnLetterhead(original, suggestedContentArea(original));
  layout.blocks.find(block => block.id === "signature")!.text = "Jane Example\nHuman Resources";
  const result = await buildLetterPdf({ ...content, id: "HV-LETTERHEAD", body: content.body.repeat(35), layout }, false);
  assert(result.plan.pages.length > 1);
  await writeFile(".cache/letter-pdfs/letterhead-preview.pdf", result.bytes);
});
test("body text flows across pages and signature follows its final line", async () => {
  const layout = defaultLetterLayout();
  const long = { ...content, body: "A detailed contribution to design, implementation, and testing of company operations. ".repeat(140) };
  const plan = await planDocument(long, layout);
  assert(plan.pages.length > 1);
  const body = plan.regions.filter(region => region.id === "body"), signature = plan.regions.find(region => region.id === "signature")!;
  const last = body.at(-1)!;
  assert(signature.page >= last.page);
  if (signature.page === last.page) assert(signature.y >= last.y + last.height + 27);
  for (const region of plan.regions) {
    assert(region.x + region.width <= plan.pages[region.page].width + 0.1);
    assert(region.y + region.height <= plan.pages[region.page].height - layout.marginBottom + 0.1);
  }
  await mkdir(".cache/letter-pdfs", { recursive: true });
  await writeFile(".cache/letter-pdfs/designer-long.pdf", await renderLetterPdf({ ...long, id: "HV-LONG", layout }, false));
});
test("signature starts on the next page when it cannot fit with its label", async () => {
  const layout = defaultLetterLayout();
  layout.pages = [{ width: 595.28, height: 300 }]; layout.marginTop = 30; layout.marginBottom = 30;
  layout.blocks = [newTextBlock("body", { binding: "body", y: 210, width: 480 }), newTextBlock("signature", { text: "Authorized signatory\nHuman Resources", afterId: "body", gap: 28 })];
  const plan = await planDocument({ ...content, body: "Completion confirmed." }, layout);
  const signature = plan.regions.find(region => region.id === "signature")!;
  assert.equal(signature.page, 1); assert.equal(signature.y, 30);
});
test("signature image and its following label stay together across a page break", async () => {
  const layout = defaultLetterLayout();
  layout.pages = [{ width: 595.28, height: 300 }]; layout.marginTop = 30; layout.marginBottom = 30;
  layout.blocks = [newTextBlock("body", { binding: "body", y: 184, width: 480 }), newTextBlock("image", { kind: "image", image: "data:image/png;base64,AAAA", width: 100, height: 30, afterId: "body", gap: 10 }), newTextBlock("label", { text: "Jane Example\nHuman Resources", afterId: "image", gap: 8 })];
  const plan = await planDocument({ ...content, body: "Confirmed." }, layout);
  const image = plan.regions.find(region => region.id === "image")!, label = plan.regions.find(region => region.id === "label")!;
  assert.equal(image.page, 1); assert.equal(label.page, 1); assert(label.y >= image.y + image.height + 8);
});
test("blank PDF template pages are valid backgrounds", async () => {
  const blank = await PDFDocument.create(); blank.addPage([595.28, 841.89]);
  const layout = defaultLetterLayout();
  layout.background = { name: "blank.pdf", kind: "pdf", data: `data:application/pdf;base64,${Buffer.from(await blank.save()).toString("base64")}` };
  const result = await renderLetterPdf({ ...content, id: "blank-template", layout }, false);
  assert.equal((await PDFDocument.load(result)).getPageCount(), 1);
});
test("custom landscape pages, multi-page PDF templates, signature images, and font styles render", async () => {
  const template = await PDFDocument.create();
  for (let index = 0; index < 2; index++) { const page = template.addPage([841.89, 595.28]); page.drawRectangle({ x: 20, y: 20, width: 801.89, height: 555.28, borderColor: rgb(0.92, 0.4, 0.18), borderWidth: 2 }); }
  const layout = defaultLetterLayout();
  layout.pages = [{ width: 841.89, height: 595.28 }, { width: 841.89, height: 595.28 }];
  layout.background = { name: "landscape-template.pdf", kind: "pdf", data: `data:application/pdf;base64,${Buffer.from(await template.save()).toString("base64")}` };
  const signature = layout.blocks.find(block => block.id === "signature")!;
  signature.fontFamily = "Times"; signature.italic = true; signature.bold = true;
  layout.blocks.push(newTextBlock("stamp", { kind: "image", image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", width: 70, height: 30, afterId: "signature" }));
  const { bytes, plan } = await buildLetterPdf({ ...content, id: "HV-LANDSCAPE", layout }, false);
  const pdf = await PDFDocument.load(bytes); assert.equal(pdf.getPageCount(), 2); assert.equal(pdf.getPage(0).getWidth(), 841.89);
  assert.equal(plan.regions.find(region => region.id === "signature")?.lines[0].font, "Times-BoldItalic");
  await writeFile(".cache/letter-pdfs/designer-landscape.pdf", bytes);
  await writeFile(".cache/letter-pdfs/designer-draft.pdf", await renderLetterPdf({ ...content, id: "HV-DRAFT" }, true));
});
