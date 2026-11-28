import { z } from "zod";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { letterActor } from "./access";
import { letterContentSchema, starterTemplates, templateSchema } from "./content";
import { assertLetterAccess, isLetterAdmin, LetterError } from "./policy";
import { changeLetter, deliverLetter, editLetter } from "./service";
import { renderLetterPdf } from "./pdf";

const respond = (error: unknown) => error instanceof LetterError
  ? Response.json({ error: { code: "LETTER_ERROR", message: error.message } }, { status: error.status }) : fail(error);
const key = z.uuid();
type Context = { params: Promise<{ id: string }> };
export async function listLetters() {
  try {
    const actor = await letterActor();
    const [items, templates, company] = await Promise.all([
      db.generatedLetter.findMany({ where: isLetterAdmin(actor) ? {} : { createdBy: actor.id }, orderBy: { createdAt: "desc" }, take: 200 }),
      db.letterTemplate.findMany({ where: isLetterAdmin(actor) ? {} : { OR: [{ createdBy: actor.id }, { createdBy: { in: (await db.user.findMany({ where: { roles: { some: { revokedAt: null, role: { code: { in: ["OWNER", "HR"] } } } } }, select: { id: true } })).map(user => user.id) } }] }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.companySetting.findUnique({ where: { id: "company" }, select: { displayName: true } }),
    ]);
    return ok({ items, templates: [...starterTemplates, ...templates], companyName: company?.displayName ?? "HEXVAULT", roles: actor.roles });
  } catch (error) { return respond(error); }
}
export async function createLetter(request: Request) {
  try {
    const actor = await letterActor();
    const input = letterContentSchema.parse(await request.json());
    const item = await db.$transaction(async tx => {
      const letter = await tx.generatedLetter.create({ data: { ...input, createdBy: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "letter.created", resourceType: "generated_letter", resourceId: letter.id } });
      return letter;
    });
    return ok({ item }, 201);
  } catch (error) { return respond(error); }
}
export async function updateLetter(request: Request, context: Context) {
  try {
    const actor = await letterActor(), id = key.parse((await context.params).id);
    const input = z.object({ revision: z.number().int().positive(), content: letterContentSchema }).strict().parse(await request.json());
    return ok({ item: await editLetter(actor, id, input.revision, input.content) });
  } catch (error) { return respond(error); }
}
export async function actOnLetter(request: Request, context: Context) {
  try {
    const actor = await letterActor(), id = key.parse((await context.params).id);
    const input = z.object({ revision: z.number().int().positive(), action: z.enum(["SUBMIT", "APPROVE", "RETURN", "SEND"]), feedback: z.string().trim().min(1).max(2000).optional(), method: z.enum(["EMAIL", "GMAIL"]).optional() }).strict().parse(await request.json());
    if (input.action === "RETURN" && !input.feedback) throw new LetterError(422, "Give a reason so the author can revise this letter.");
    if (input.action === "SEND") {
      if (!input.method) throw new LetterError(422, "Choose email or Gmail.");
      await deliverLetter(actor, id, input.revision, input.method);
      return ok({ sent: true });
    }
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
    const input = templateSchema.parse(await request.json());
    const item = await db.letterTemplate.create({ data: { ...input, createdBy: actor.id } });
    return ok({ item }, 201);
  } catch (error) { return respond(error); }
}
