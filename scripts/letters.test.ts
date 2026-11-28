import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { db } from "../packages/core/src/lib/db";
import { sendMail } from "../packages/core/src/lib/email";
import { fillTemplate, letterContentSchema, type LetterContent } from "../packages/core/src/features/letters/content";
import { nextLetterStatus, assertLetterAccess } from "../packages/core/src/features/letters/policy";
import { changeLetter, deliverLetter, editLetter } from "../packages/core/src/features/letters/service";
import { renderLetterPdf } from "../packages/core/src/features/letters/pdf";
import type { GeneratedLetter } from "@prisma/client";

const content: LetterContent = { title: "Project completion certificate", companyName: "HEXVAULT", recipientName: "Alex Candidate", recipientEmail: "alex@example.com", documentDate: "2026-11-28", body: "This certifies that Alex Candidate successfully completed their contribution to the workforce project.\n\nTheir work covered design, implementation, and testing.\n\nHuman Resources\nHEXVAULT", emailSubject: "Your project completion certificate", emailBody: "Dear Alex,\n\nPlease find your approved certificate attached.\n\nRegards,\nHuman Resources" };
const hr = { id: "hr", roles: ["HR"] }, owner = { id: "owner", roles: ["OWNER"] }, manager = { id: "manager", roles: ["TEAM_LEAD"] };
function database(status = "DRAFT") {
  let row: GeneratedLetter = { ...content, id: "00000000-0000-4000-8000-000000000001", createdBy: hr.id, status, revision: 1, approvedBy: status === "APPROVED" ? owner.id : null, approvedAt: status === "APPROVED" ? new Date() : null, feedback: null, sentBy: null, sentAt: null, deliveryMethod: null, createdAt: new Date(), updatedAt: new Date() };
  const audit: unknown[] = [];
  const client = {
    generatedLetter: {
      findUnique: async () => ({ ...row }), findUniqueOrThrow: async () => ({ ...row }),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (!Object.entries(where).every(([key, value]) => row[key as keyof GeneratedLetter] === value)) return { count: 0 };
        row = { ...row, ...data, revision: typeof data.revision === "object" ? row.revision + 1 : row.revision } as GeneratedLetter;
        return { count: 1 };
      },
    }, auditLog: { create: async (data: unknown) => { audit.push(data); } },
    $transaction: async <T>(run: (tx: unknown) => Promise<T>) => run(client),
  };
  return { client: client as unknown as typeof db, row: () => row, audit };
}

test("HR and managers cannot approve; owner without HR cannot send; no early sends", () => {
  for (const actor of [hr, manager]) assert.throws(() => nextLetterStatus(actor, "PENDING_APPROVAL", "APPROVE"), /Only the owner/);
  assert.throws(() => nextLetterStatus(owner, "APPROVED", "SEND"), /Only HR/);
  for (const status of ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED", "SENDING", "SENT", "DELIVERY_UNKNOWN"]) assert.throws(() => nextLetterStatus(hr, status, "SEND"), /Owner approval/);
  assert.throws(() => assertLetterAccess(manager, { createdBy: hr.id }), /own letters/);
});

test("owner approval and returns enforce the current revision", async () => {
  const state = database();
  await changeLetter(hr, state.row().id, 1, "SUBMIT", undefined, state.client);
  assert.equal(state.row().status, "PENDING_APPROVAL");
  await assert.rejects(changeLetter(owner, state.row().id, 1, "APPROVE", undefined, state.client), /changed/);
  await changeLetter(owner, state.row().id, 2, "RETURN", "Correct the start date", state.client);
  assert.equal(state.row().status, "CHANGES_REQUESTED");
  assert.equal(state.row().feedback, "Correct the start date");
  await changeLetter(hr, state.row().id, 3, "SUBMIT", undefined, state.client);
  await changeLetter(owner, state.row().id, 4, "APPROVE", undefined, state.client);
  assert.equal(state.row().approvedBy, owner.id);
  assert.equal(state.row().status, "APPROVED");
});

test("changing approved recipient or content clears approval and prevents sending", async () => {
  const state = database("APPROVED");
  await editLetter(hr, state.row().id, 1, { ...content, recipientEmail: "changed@example.com" }, state.client);
  assert.equal(state.row().status, "DRAFT");
  assert.equal(state.row().approvedBy, null);
  assert.equal(state.row().approvedAt, null);
  await assert.rejects(deliverLetter(hr, state.row().id, 2, "EMAIL", state.client), /Owner approval/);
});

test("concurrent send requests deliver exactly one approved PDF to the approved recipient", async () => {
  const state = database("APPROVED");
  const deliveries: unknown[] = [];
  const sender = async (input: { to: string; attachments?: { content: Buffer }[] }) => { deliveries.push(input); assert.equal(input.to, content.recipientEmail); assert.equal(input.attachments?.[0].content.subarray(0, 4).toString(), "%PDF"); };
  const results = await Promise.allSettled([1, 2].map(() => deliverLetter(hr, state.row().id, 1, "EMAIL", state.client, { email: sender, gmail: sender })));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(deliveries.length, 1); assert.equal(state.row().status, "SENT");
  assert.equal(state.row().sentBy, hr.id); assert(state.row().sentAt);
});

test("Gmail uses its selected sender and uncertain delivery cannot be retried", async () => {
  const state = database("APPROVED"); let companyCalls = 0, gmailCalls = 0;
  const delivery = { email: async () => { companyCalls++; }, gmail: async () => { gmailCalls++; throw new Error("Timeout after possible SMTP acceptance"); } };
  await assert.rejects(deliverLetter(hr, state.row().id, 1, "GMAIL", state.client, delivery), /could not be confirmed/);
  assert.equal(companyCalls, 0); assert.equal(gmailCalls, 1); assert.equal(state.row().status, "DELIVERY_UNKNOWN");
  await assert.rejects(deliverLetter(hr, state.row().id, 2, "GMAIL", state.client, delivery), /Owner approval/);
  assert.equal(gmailCalls, 1);
});

test("templates do not release unresolved placeholders or unsupported PDF text", () => {
  assert.equal(fillTemplate("Dear {{candidate_name}}: {{custom_details}}", { candidate_name: "Alex" }), "Dear Alex: {{custom_details}}");
  assert(!letterContentSchema.safeParse({ ...content, body: "Dear {{candidate_name}}, please accept this letter." }).success);
  assert(!letterContentSchema.safeParse({ ...content, recipientName: "Alex 😀" }).success);
  assert(!letterContentSchema.safeParse({ ...content, recipientEmail: "invalid" }).success);
});

test("Resend and Brevo receive the original PDF as a base64 attachment", async () => {
  const envKeys = ["RESEND_API_KEY", "RESEND_FROM", "BREVO_API_KEY", "SMTP_FROM"] as const;
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response("{}", { status: 200 });
  };
  try {
    const bytes = Buffer.from("%PDF-original-test-bytes");
    const input = { to: content.recipientEmail, subject: content.emailSubject, text: content.emailBody, html: "<p>Approved certificate attached</p>", attachments: [{ filename: "certificate.pdf", content: bytes, contentType: "application/pdf" }] };
    process.env.RESEND_API_KEY = "test-key"; process.env.RESEND_FROM = "hr@example.com";
    await sendMail(input);
    assert.equal(requests[0].url, "https://api.resend.com/emails");
    assert.deepEqual(requests[0].body.attachments, [{ filename: "certificate.pdf", content: bytes.toString("base64") }]);
    delete process.env.RESEND_API_KEY;
    process.env.BREVO_API_KEY = "test-key"; process.env.SMTP_FROM = "HR <hr@example.com>";
    await sendMail(input);
    assert.equal(requests[1].url, "https://api.brevo.com/v3/smtp/email");
    assert.deepEqual(requests[1].body.attachment, [{ name: "certificate.pdf", content: bytes.toString("base64") }]);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});

test("PDFs paginate long text and produce review artifacts", async () => {
  await mkdir(".cache/letter-pdfs", { recursive: true });
  const draft = await renderLetterPdf({ ...content, id: "HV-PREVIEW-2026-0001" }, true);
  const approved = await renderLetterPdf({ ...content, id: "HV-APPROVED-2026-0001", approvedBy: owner.id }, false);
  const long = await renderLetterPdf({ ...content, id: "HV-LONG-2026-0001", body: ("A long service statement with details of the candidate's work, responsibilities, and completion. ").repeat(160) }, false);
  assert.equal((await PDFDocument.load(draft)).getPageCount(), 1);
  assert((await PDFDocument.load(long)).getPageCount() > 1);
  await writeFile(".cache/letter-pdfs/letter-draft.pdf", draft);
  await writeFile(".cache/letter-pdfs/letter-approved.pdf", approved);
  await writeFile(".cache/letter-pdfs/letter-long.pdf", long);
});
