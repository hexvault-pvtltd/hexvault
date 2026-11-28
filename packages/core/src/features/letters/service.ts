import { db } from "@core/lib/db";
import { sendGmail, sendMail } from "@core/lib/email";
import { letterContentSchema } from "./content";
import { assertLetterAccess, LetterError, nextLetterStatus, type LetterActor } from "./policy";
import { renderLetterPdf } from "./pdf";

export async function changeLetter(actor: LetterActor, id: string, revision: number, action: "SUBMIT" | "APPROVE" | "RETURN", feedback?: string, database = db) {
  return database.$transaction(async tx => {
    const letter = await tx.generatedLetter.findUnique({ where: { id } });
    if (!letter) throw new LetterError(404, "Letter not found.");
    assertLetterAccess(actor, letter);
    const status = nextLetterStatus(actor, letter.status, action);
    const changed = await tx.generatedLetter.updateMany({ where: { id, revision, status: letter.status }, data: {
      status, revision: { increment: 1 },
      ...(action === "APPROVE" ? { approvedBy: actor.id, approvedAt: new Date(), feedback: null } : { approvedBy: null, approvedAt: null, feedback: feedback ?? null }),
    } });
    if (!changed.count) throw new LetterError(409, "This letter changed. Refresh and review the latest version.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: `letter.${action.toLowerCase()}`, resourceType: "generated_letter", resourceId: id, metadata: { revision, status, feedback: feedback ?? null } } });
    return tx.generatedLetter.findUniqueOrThrow({ where: { id } });
  });
}

export async function editLetter(actor: LetterActor, id: string, revision: number, input: unknown, database = db) {
  const content = letterContentSchema.parse(input);
  return database.$transaction(async tx => {
    const letter = await tx.generatedLetter.findUnique({ where: { id } });
    if (!letter) throw new LetterError(404, "Letter not found.");
    assertLetterAccess(actor, letter);
    if (!["DRAFT", "CHANGES_REQUESTED", "APPROVED"].includes(letter.status)) throw new LetterError(409, "Only draft, returned, or approved letters can be edited. An edit requires fresh owner approval.");
    const changed = await tx.generatedLetter.updateMany({ where: { id, revision, status: letter.status }, data: {
      ...content, status: "DRAFT", revision: { increment: 1 }, approvedBy: null, approvedAt: null, feedback: null,
    } });
    if (!changed.count) throw new LetterError(409, "This letter changed. Refresh before editing.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.edited", resourceType: "generated_letter", resourceId: id, metadata: { revision, approvalCleared: true } } });
    return tx.generatedLetter.findUniqueOrThrow({ where: { id } });
  });
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export async function deliverLetter(actor: LetterActor, id: string, revision: number, method: "EMAIL" | "GMAIL", database = db, delivery = { email: sendMail, gmail: sendGmail }) {
  const letter = await database.generatedLetter.findUnique({ where: { id } });
  if (!letter) throw new LetterError(404, "Letter not found.");
  assertLetterAccess(actor, letter);
  nextLetterStatus(actor, letter.status, "SEND");
  if (!letter.approvedAt || !letter.approvedBy) throw new LetterError(409, "The owner must approve this revision first.");
  if (method === "GMAIL" && delivery.gmail === sendGmail && (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)) throw new LetterError(422, "Gmail is not configured. Ask the administrator to set GMAIL_USER and GMAIL_APP_PASSWORD.");
  if (method === "EMAIL" && delivery.email === sendMail && !(
    (process.env.RESEND_API_KEY && process.env.RESEND_FROM) ||
    (process.env.BREVO_API_KEY && process.env.SMTP_FROM) ||
    (process.env.SMTP_HOST && process.env.SMTP_FROM)
  )) throw new LetterError(422, "Company email is not configured. Configure Resend, Brevo, or SMTP first.");
  // Render before claiming delivery. A rendering failure must not leave SENDING.
  const pdf = await renderLetterPdf(letter, false);
  await database.$transaction(async tx => {
    const claimed = await tx.generatedLetter.updateMany({ where: { id, revision, status: "APPROVED", approvedBy: letter.approvedBy }, data: { status: "SENDING", deliveryMethod: method, sentBy: actor.id, revision: { increment: 1 } } });
    if (!claimed.count) throw new LetterError(409, "This letter changed or delivery already started. Refresh its status.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.delivery_started", resourceType: "generated_letter", resourceId: id, metadata: { revision, method } } });
  });
  try {
    await (method === "GMAIL" ? delivery.gmail : delivery.email)({
      to: letter.recipientEmail, subject: letter.emailSubject, text: letter.emailBody,
      html: `<div style="white-space:pre-wrap">${escapeHtml(letter.emailBody)}</div>`,
      attachments: [{ filename: `letter-${id}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
  } catch {
    // SMTP timeouts may occur after acceptance. Never silently retry and risk
    // sending a duplicate or releasing a changed revision.
    await database.$transaction(async tx => {
      await tx.generatedLetter.updateMany({ where: { id, status: "SENDING" }, data: { status: "DELIVERY_UNKNOWN" } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.delivery_unknown", resourceType: "generated_letter", resourceId: id, metadata: { method } } });
    });
    throw new LetterError(502, "Delivery could not be confirmed. Check the sender's mail logs before preparing a new delivery; this letter will not be retried automatically.");
  }
  await database.$transaction(async tx => {
    await tx.generatedLetter.updateMany({ where: { id, status: "SENDING" }, data: { status: "SENT", sentAt: new Date() } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.sent", resourceType: "generated_letter", resourceId: id, metadata: { method, revision } } });
  });
}
