import { createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { db } from "../../lib/db";
import { canIssueCertificates, certificatePublicSelect, issueSchema, newCertificateId, verifySchema } from "./validation";
import { canReadDocument } from "../documents/permissions";
import { createPrivateDownload } from "../../lib/storage";

export class CertificateError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
type Actor = { id: string; roles: string[] };
export async function issueCertificate(actor: Actor, caseId: string, input: unknown, database = db) {
  if (!canIssueCertificates(actor)) throw new CertificateError(403, "FORBIDDEN", "Only HR or the Owner can issue certificates.");
  const data = issueSchema.parse(input);
  const certificateId = newCertificateId();
  const dobHash = await hash(`${certificateId}:${data.dateOfBirth}`, 12);
  return database.$transaction(async tx => {
    const record = await tx.offboardingCase.findUnique({ where: { id: caseId }, include: { employee: true } });
    if (!record) throw new CertificateError(404, "NOT_FOUND", "Offboarding case not found.");
    if (record.status !== "COMPLETE") throw new CertificateError(409, "OFFBOARDING_INCOMPLETE", "Finalize offboarding before issuing a certificate.");
    const document = data.documentId ? await tx.employeeDocument.findUnique({ where: { id: data.documentId }, include: { currentFile: true } }) : null;
    if (data.documentId && (!document || document.employeeId !== record.employeeId || !canReadDocument(actor, document) || document.currentFile.scanStatus !== "CLEAN")) {
      throw new CertificateError(422, "INVALID_CERTIFICATE_FILE", "Choose a verified document belonging to this employee that you can access.");
    }
    if (data.employmentEnd > record.effectiveDate.toISOString().slice(0, 10) || data.employmentEnd > new Date().toISOString().slice(0, 10)) {
      throw new CertificateError(422, "INVALID_PERIOD", "The certificate end date must not be in the future or after the recorded exit date.");
    }
    const certificate = await tx.employmentCertificate.create({ data: {
      certificateId, caseId, employeeId: record.employeeId, kind: data.kind, title: data.title,
      recipientName: record.employee.fullName, jobTitle: data.jobTitle, statement: data.statement,
      employmentStart: new Date(data.employmentStart), employmentEnd: new Date(data.employmentEnd),
      dobHash, issuedBy: actor.id,
      fileId: document?.currentFileId ?? null,
    }, select: certificatePublicSelect });
    await tx.employeeHistory.create({ data: { employeeId: record.employeeId, actorId: actor.id, eventType: "CERTIFICATE_ISSUED", newData: { title: data.title, certificateId } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "certificate.issued", resourceType: "employee", resourceId: record.employeeId, metadata: { certificateId, caseId } } });
    return certificate;
  });
}

export async function revokeCertificate(actor: Actor, certificateId: string, database = db) {
  if (!canIssueCertificates(actor)) throw new CertificateError(403, "FORBIDDEN", "Only HR or the Owner can revoke certificates.");
  return database.$transaction(async tx => {
    const certificate = await tx.employmentCertificate.findUnique({ where: { certificateId } });
    if (!certificate) throw new CertificateError(404, "NOT_FOUND", "Certificate not found.");
    const changed = await tx.employmentCertificate.updateMany({ where: { certificateId, revokedAt: null }, data: { revokedAt: new Date(), revokedBy: actor.id } });
    if (changed.count) {
      await tx.employeeHistory.create({ data: { employeeId: certificate.employeeId, actorId: actor.id, eventType: "CERTIFICATE_REVOKED", newData: { title: certificate.title, certificateId } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "certificate.revoked", resourceType: "employee", resourceId: certificate.employeeId, metadata: { certificateId } } });
    }
    return { certificateId, revoked: true };
  });
}

export async function consumeVerificationLimit(ip: string, certificateId: string, database = db, now = new Date()) {
  const window = Math.floor(now.getTime() / 900000);
  const expiresAt = new Date((window + 1) * 900000);
  const buckets = [[`ip:${ip.slice(0, 200)}`, 60], [`certificate:${certificateId}`, 10]] as const;
  const allowed = await database.$transaction(async tx => {
    await tx.certificateVerificationLimit.deleteMany({ where: { expiresAt: { lte: now } } });
    const results: boolean[] = [];
    for (const [key, maximum] of buckets) {
      const id = createHash("sha256").update(`${window}:${key}`).digest("hex");
      const row = await tx.certificateVerificationLimit.upsert({ where: { id }, create: { id, expiresAt, count: 1 }, update: { count: { increment: 1 } } });
      results.push(row.count <= maximum);
    }
    return results.every(Boolean);
  });
  if (!allowed) throw new CertificateError(429, "RATE_LIMITED", "Too many verification attempts. Try again in 15 minutes.");
}

export async function verifyCertificate(input: unknown, ip: string, database = db) {
  const data = verifySchema.parse(input);
  await consumeVerificationLimit(ip, data.certificateId, database);
  const certificate = await database.employmentCertificate.findUnique({ where: { certificateId: data.certificateId }, select: { ...certificatePublicSelect, dobHash: true, file: { select: { storageKey: true, originalFilename: true, scanStatus: true } } } });
  if (!certificate || !await compare(`${data.certificateId}:${data.dateOfBirth}`, certificate.dobHash)) {
    throw new CertificateError(404, "NOT_VERIFIED", "The certificate ID and date of birth could not be verified.");
  }
  // Revoked certificates reveal no employment details or statements.
  if (certificate.revokedAt) return { status: "REVOKED" as const, certificateId: certificate.certificateId };
  const { dobHash: _privateHash, revokedAt: _revokedAt, file, ...publicFields } = certificate;
  void _privateHash; void _revokedAt;
  const original = file?.scanStatus === "CLEAN" ? {
    filename: file.originalFilename,
    url: await createPrivateDownload(file.storageKey, file.originalFilename, "attachment", 300),
    expiresInSeconds: 300,
  } : null;
  return { status: "VERIFIED" as const, ...publicFields, original };
}
