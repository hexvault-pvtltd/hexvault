import { z } from "zod";
import { NextResponse } from "next/server";
import { currentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { fail } from "../../lib/http";
import { CertificateError, issueCertificate, revokeCertificate, verifyCertificate } from "./service";
import { canIssueCertificates, certificatePublicSelect, certificateIdSchema } from "./validation";
import { canReadDocument } from "../documents/permissions";

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
function response(data: unknown, status = 200) { return NextResponse.json({ data }, { status, headers }); }
function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status, headers }); }
function failure(error: unknown) {
  if (error instanceof CertificateError) return errorResponse(error.status, error.code, error.message);
  const result = fail(error);
  result.headers.set("Cache-Control", "private, no-store");
  return result;
}
type CaseContext = { params: Promise<{ id: string }> };
export async function listCaseCertificates(_request: Request, { params }: CaseContext) {
  const actor = await currentUser();
  if (!actor) return errorResponse(401, "UNAUTHENTICATED", "Sign in to continue.");
  if (!canIssueCertificates(actor)) return errorResponse(403, "FORBIDDEN", "Only HR or the Owner can manage certificates.");
  try {
    const caseId = z.string().uuid().parse((await params).id);
    const record = await db.offboardingCase.findUnique({ where: { id: caseId }, select: { employeeId: true } });
    if (!record) return errorResponse(404, "NOT_FOUND", "Offboarding case not found.");
    const documents = await db.employeeDocument.findMany({ where: { employeeId: record.employeeId, currentFile: { scanStatus: "CLEAN" } }, include: { currentFile: { select: { originalFilename: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
    return response({ items: await db.employmentCertificate.findMany({ where: { caseId }, select: certificatePublicSelect, orderBy: { issuedAt: "desc" }, take: 100 }), documents: documents.filter(document => canReadDocument(actor, document)).map(document => ({ id: document.id, category: document.category, filename: document.currentFile.originalFilename })) });
  } catch (error) { return failure(error); }
}
export async function createCaseCertificate(request: Request, { params }: CaseContext) {
  const actor = await currentUser();
  if (!actor) return errorResponse(401, "UNAUTHENTICATED", "Sign in to continue.");
  if (!canIssueCertificates(actor)) return errorResponse(403, "FORBIDDEN", "Only HR or the Owner can issue certificates.");
  try {
    const caseId = z.string().uuid().parse((await params).id);
    return response(await issueCertificate(actor, caseId, await request.json()), 201);
  } catch (error) { return failure(error); }
}
export async function revoke(request: Request, { params }: { params: Promise<{ certificateId: string }> }) {
  const actor = await currentUser();
  if (!actor) return errorResponse(401, "UNAUTHENTICATED", "Sign in to continue.");
  if (!canIssueCertificates(actor)) return errorResponse(403, "FORBIDDEN", "Only HR or the Owner can revoke certificates.");
  try {
    z.object({ action: z.literal("REVOKE") }).strict().parse(await request.json());
    const id = certificateIdSchema.parse((await params).certificateId);
    return response(await revokeCertificate(actor, id));
  } catch (error) { return failure(error); }
}
export async function mine() {
  const actor = await currentUser();
  if (!actor) return errorResponse(401, "UNAUTHENTICATED", "Sign in to continue.");
  try {
    const items = actor.employee ? await db.employmentCertificate.findMany({ where: { employeeId: actor.employee.id }, select: certificatePublicSelect, orderBy: { issuedAt: "desc" }, take: 100 }) : [];
    return response({ items });
  } catch (error) { return failure(error); }
}
export async function verify(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    return response(await verifyCertificate(await request.json(), ip));
  } catch (error) { return failure(error); }
}
