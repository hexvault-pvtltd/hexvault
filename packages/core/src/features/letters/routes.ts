import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { letterActor } from "./access";
import { letterContentSchema, starterTemplates, templateSchema } from "./content";
import { assertLetterAccess, isLetterAdmin, LetterError } from "./policy";
import { changeLetter, editLetter, letterData, prepareLetterShare, validateLetterPdf } from "./service";
import { renderLetterPdf } from "./pdf";
import { findLetterRecipients } from "./recipients";
import { LETTER_LIMITS } from "./limits";

const respond = (error: unknown) => error instanceof LetterError
  ? Response.json({ error: { code: "LETTER_ERROR", message: error.message } }, { status: error.status }) : fail(error);
const key = z.uuid();
type Context = { params: Promise<{ id: string }> };
async function requestBody(request: Request) {
  const body = await request.text();
  if (body.length > LETTER_LIMITS.uploads.requestJsonCharacters) throw new LetterError(413, "This document is too large. Use smaller template and signature images.");
  return JSON.parse(body);
}
export async function listLetters() {
  try {
    const actor = await letterActor();
    const [items, templates, company] = await Promise.all([
      db.generatedLetter.findMany({ where: isLetterAdmin(actor) ? {} : { createdBy: actor.id }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.letterTemplate.findMany({ where: isLetterAdmin(actor) ? {} : { OR: [{ createdBy: actor.id }, { createdBy: { in: (await db.user.findMany({ where: { roles: { some: { revokedAt: null, role: { code: { in: ["OWNER", "HR"] } } } } }, select: { id: true } })).map(user => user.id) } }] }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.companySetting.findUnique({ where: { id: "company" }, select: { displayName: true } }),
    ]);
    return ok({ items, templates: [...starterTemplates, ...templates], companyName: company?.displayName ?? "HEXVAULT", roles: actor.roles,
      currentUser: { userId: actor.id, employeeId: actor.employee?.id ?? null, fullName: actor.employee?.fullName ?? actor.email, email: actor.employee?.workEmail ?? actor.email, phone: actor.employee?.phone ?? "", title: actor.employee?.title ?? "" },
      canCreateEmployee: isLetterAdmin(actor),
    });
  } catch (error) { return respond(error); }
}
export async function listLetterRecipients(request: Request) {
  try {
    const actor = await letterActor();
    const params = new URL(request.url).searchParams;
    const query = z.string().trim().max(100).parse(params.get("q") ?? "");
    const id = params.has("id") ? z.uuid().parse(params.get("id")) : undefined;
    return ok({ items: await findLetterRecipients(actor, query, id) });
  } catch (error) { return respond(error); }
}
export async function createLetter(request: Request) {
  try {
    const actor = await letterActor();
    const input = letterContentSchema.parse(await requestBody(request));
    await validateLetterPdf(input);
    const item = await db.$transaction(async tx => {
      const letter = await tx.generatedLetter.create({ data: { ...letterData(input), createdBy: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.created", resourceType: "generated_letter", resourceId: letter.id } });
      return letter;
    });
    return ok({ item }, 201);
  } catch (error) { return respond(error); }
}
export async function updateLetter(request: Request, context: Context) {
  try {
    const actor = await letterActor(), id = key.parse((await context.params).id);
    const input = z.object({ revision: z.number().int().positive(), content: letterContentSchema }).strict().parse(await requestBody(request));
    return ok({ item: await editLetter(actor, id, input.revision, input.content) });
  } catch (error) { return respond(error); }
}
export async function actOnLetter(request: Request, context: Context) {
  try {
    const actor = await letterActor(), id = key.parse((await context.params).id);
    const input = z.object({ revision: z.number().int().positive(), action: z.enum(["SUBMIT", "APPROVE", "RETURN"]), feedback: z.string().trim().min(1).max(2000).optional() }).strict().parse(await requestBody(request));
    if (input.action === "RETURN" && !input.feedback) throw new LetterError(422, "Give a reason so the author can revise this letter.");
    return ok({ item: await changeLetter(actor, id, input.revision, input.action, input.feedback) });
  } catch (error) { return respond(error); }
}
export async function downloadLetter(_request: Request, context: Context) {
  try {
    const actor = await letterActor(), id = key.parse((await context.params).id);
    const letter = await db.generatedLetter.findUnique({ where: { id } });
    if (!letter) throw new LetterError(404, "Letter not found.");
    assertLetterAccess(actor, letter);
    const draft = !letter.approvedAt || !letter.approvedBy;
    const bytes = await renderLetterPdf(letter, draft);
    return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${draft ? "draft" : "letter"}-${id}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) { return respond(error); }
}
export async function createTemplate(request: Request) {
  try {
    const actor = await letterActor();
    const input = templateSchema.parse(await requestBody(request));
    const item = await db.letterTemplate.create({ data: { ...input, whatsappText: input.whatsappText ?? "", layout: input.layout ?? Prisma.DbNull, createdBy: actor.id } });
    return ok({ item }, 201);
  } catch (error) { return respond(error); }
}
export async function shareLetter(request: Request, context: Context) {
  try {
    const actor = await letterActor(), id = key.parse((await context.params).id);
    const input = z.object({ revision: z.number().int().positive(), channel: z.enum(["GMAIL", "EMAIL", "WHATSAPP", "DEVICE"]) }).strict().parse(await requestBody(request));
    const { letter, pdf } = await prepareLetterShare(actor, id, input.revision, input.channel);
    return Response.json({ data: { filename: `letter-${id}.pdf`, pdf: Buffer.from(pdf).toString("base64"), recipientEmail: letter.recipientEmail, recipientPhone: letter.recipientPhone, subject: letter.emailSubject, emailText: letter.emailBody, whatsappText: letter.whatsappText || letter.emailBody } }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return respond(error); }
}
