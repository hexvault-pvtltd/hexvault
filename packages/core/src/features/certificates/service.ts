import { createHash } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { db } from "../../lib/db";
import { canIssueCertificates, certificatePublicSelect, certificatePrefix, issueSchema, newCertificateId, verifySchema } from "./validation";
import { canReadDocument } from "../documents/permissions";
import { createPrivateDownload } from "../../lib/storage";

export class CertificateError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
type Actor = { id: string; roles: string[] };
export async function issueCertificate(actor: Actor, caseId: string, input: unknown, database = db) {
  if (!canIssueCertificates(actor)) throw new CertificateError(403, "FORBIDDEN", "Only HR or the Owner can issue certificates.");
  const data = issueSchema.parse(input);
  return database.$transaction(async tx => {
    const record = await tx.offboardingCase.findUnique({ where: { id: caseId }, include: { employee: true } });
    if (!record) throw new CertificateError(404, "NOT_FOUND", "Offboarding case not found.");
    if (record.status !== "COMPLETE") throw new CertificateError(409, "OFFBOARDING_INCOMPLETE", "Finalize offboarding before issuing a certificate.");
    const document = data.documentId ? await tx.employeeDocument.findUnique({ where: { id: data.documentId }, include: { currentFile: true } }) : null;
    if (data.documentId && (!document || document.employeeId !== record.employeeId || !canReadDocument(actor, document) || document.currentFile.scanStatus !== "CLEAN" || document.currentFile.mimeType === "application/zip")) {
      throw new CertificateError(422, "INVALID_CERTIFICATE_FILE", "Choose a verified document belonging to this employee that you can access.");
    }
    if (data.employmentEnd > record.effectiveDate.toISOString().slice(0, 10) || data.employmentEnd > new Date().toISOString().slice(0, 10)) {
      throw new CertificateError(422, "INVALID_PERIOD", "The certificate end date must not be in the future or after the recorded exit date.");
    }
    const year = data.employmentEnd.slice(0, 4);
    const prefix = certificatePrefix(data.kind, year);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`certificate-number:${prefix}`}))`;
    const existing = await tx.employmentCertificate.findMany({ where: { certificateId: { startsWith: prefix } }, select: { certificateId: true } });
    const used = new Set(existing.map(item => item.certificateId));
    const employeeNumber = record.employee.employeeCode.match(/\d+$/)?.[0];
    // Employees without a numeric code use the next available registry number.
    const highest = existing.reduce((maximum, item) => {
      const digits = item.certificateId.slice(prefix.length).split("-")[0];
      return /^\d+$/.test(digits) && BigInt(digits) > maximum ? BigInt(digits) : maximum;
    }, BigInt(0));
    const base = newCertificateId(data.kind, year, employeeNumber ?? (highest + BigInt(1)).toString());
    let certificateId = data.certificateId ?? base;
    if (data.certificateId && used.has(certificateId)) throw new CertificateError(409, "CERTIFICATE_ID_EXISTS", "This certificate ID is already in use. Enter a unique ID or leave it blank to assign one automatically.");
    if (data.certificateId && !data.certificateId.startsWith(prefix)) throw new CertificateError(422, "INVALID_CERTIFICATE_ID", `Use ${prefix} followed by the four-digit number to match the certificate type and employment end year.`);
    if (!data.certificateId) {
      for (let revision = 2; used.has(certificateId); revision++) certificateId = `${base}-${String(revision).padStart(2, "0")}`;
    }
    const dobHash = await hash(`${certificateId}:${data.dateOfBirth}`, 12);
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
    const certificate = await tx.employmentCertificate.findFirst({ where: { OR: [{ certificateId }, { verificationAlias: certificateId }] } });
    if (!certificate) throw new CertificateError(404, "NOT_FOUND", "Certificate not found.");
    certificateId = certificate.certificateId;
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
  const certificate = await database.employmentCertificate.findFirst({ where: { OR: [{ certificateId: data.certificateId }, { verificationAlias: data.certificateId }] }, select: { ...certificatePublicSelect, verificationAlias: true, dobHash: true, file: { select: { storageKey: true, originalFilename: true, scanStatus: true } } } });
  await consumeVerificationLimit(ip, certificate?.certificateId ?? data.certificateId, database);
  if (!certificate || !await compare(`${certificate.verificationAlias ?? certificate.certificateId}:${data.dateOfBirth}`, certificate.dobHash)) {
    throw new CertificateError(404, "NOT_VERIFIED", "The certificate ID and date of birth could not be verified.");
  }
  // Revoked certificates reveal no employment details or statements.
  if (certificate.revokedAt) return { status: "REVOKED" as const, certificateId: certificate.certificateId };
  const { dobHash: _privateHash, revokedAt: _revokedAt, verificationAlias: _privateAlias, file, ...publicFields } = certificate;
  void _privateHash; void _revokedAt; void _privateAlias;
  const original = file?.scanStatus === "CLEAN" ? {
    filename: file.originalFilename,
    url: await createPrivateDownload(file.storageKey, file.originalFilename, "attachment", 300),
    expiresInSeconds: 300,
  } : null;
  return { status: "VERIFIED" as const, ...publicFields, original };
}
