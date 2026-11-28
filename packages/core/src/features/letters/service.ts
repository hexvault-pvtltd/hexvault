import { Prisma } from "@prisma/client";
import { db } from "@core/lib/db";
import { letterContentSchema, type LetterContent } from "./content";
import { assertLetterAccess, LetterError, nextLetterStatus, type LetterActor } from "./policy";
import { renderLetterPdf } from "./pdf";

export function letterData(content: LetterContent) {
  return { ...content, recipientPhone: content.recipientPhone ?? "", whatsappText: content.whatsappText ?? "", layout: content.layout ?? Prisma.DbNull };
}
export async function validateLetterPdf(content: LetterContent) {
  try { await renderLetterPdf({ ...content, id: "PREVIEW" }, true); }
  catch (error) { throw new LetterError(422, error instanceof Error ? error.message : "The layout could not be rendered."); }
}
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
  await validateLetterPdf(content);
  return database.$transaction(async tx => {
    const letter = await tx.generatedLetter.findUnique({ where: { id } });
    if (!letter) throw new LetterError(404, "Letter not found.");
    assertLetterAccess(actor, letter);
    if (!["DRAFT", "CHANGES_REQUESTED", "APPROVED"].includes(letter.status)) throw new LetterError(409, "Only draft, returned, or approved letters can be edited. An edit requires fresh owner approval.");
    const changed = await tx.generatedLetter.updateMany({ where: { id, revision, status: letter.status }, data: {
      ...letterData(content), status: "DRAFT", revision: { increment: 1 }, approvedBy: null, approvedAt: null, feedback: null,
    } });
    if (!changed.count) throw new LetterError(409, "This letter changed. Refresh before editing.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.edited", resourceType: "generated_letter", resourceId: id, metadata: { revision, approvalCleared: true } } });
    return tx.generatedLetter.findUniqueOrThrow({ where: { id } });
  });
}
export async function prepareLetterShare(actor: LetterActor, id: string, revision: number, channel: string, database = db) {
  const letter = await database.generatedLetter.findUnique({ where: { id } });
  if (!letter) throw new LetterError(404, "Letter not found.");
  assertLetterAccess(actor, letter);
  nextLetterStatus(actor, letter.status, "SHARE");
  if (!letter.approvedAt || !letter.approvedBy) throw new LetterError(409, "The owner must approve this revision first.");
  const pdf = await renderLetterPdf(letter, false);
  await database.$transaction(async tx => {
    // Recheck the approved revision after rendering. This locks the row against
    // concurrent edits until the audit record has been saved.
    const current = await tx.generatedLetter.updateMany({ where: { id, revision, status: "APPROVED", approvedBy: letter.approvedBy }, data: { updatedAt: new Date() } });
    if (!current.count) throw new LetterError(409, "This letter changed. Refresh and review its latest revision.");
    await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.share_prepared", resourceType: "generated_letter", resourceId: id, metadata: { revision, channel } } });
  });
  // Opening an external composer cannot confirm that a message was sent.
  return { letter, pdf };
}
