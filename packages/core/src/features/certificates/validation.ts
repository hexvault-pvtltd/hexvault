import { randomBytes } from "node:crypto";
import { z } from "zod";

export const certificateKinds = ["EXPERIENCE", "RELIEVING", "INTERNSHIP", "OTHER"] as const;
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");
export const birthDate = dateOnly.refine(value => value >= "1900-01-01" && value < new Date().toISOString().slice(0, 10), "Enter a past date of birth.");
export const issueSchema = z.object({
  kind: z.enum(certificateKinds), title: z.string().trim().min(3).max(120),
  jobTitle: z.string().trim().min(2).max(120), statement: z.string().trim().min(20).max(4000),
  employmentStart: dateOnly, employmentEnd: dateOnly, dateOfBirth: birthDate,
  documentId: z.string().uuid().optional(),
}).strict().refine(value => value.employmentStart <= value.employmentEnd, { message: "Employment end must be on or after the start date.", path: ["employmentEnd"] });
export const verifySchema = z.object({
  certificateId: z.string().trim().toUpperCase().regex(/^HV-[A-F0-9]{32}$/),
  dateOfBirth: birthDate,
}).strict();
export function newCertificateId() { return `HV-${randomBytes(16).toString("hex").toUpperCase()}`; }
export function canIssueCertificates(actor: { roles: string[] }) { return actor.roles.some(role => role === "OWNER" || role === "HR"); }

// Deliberately excludes DOB hash, internal employee/case IDs and revocation actor.
export const certificatePublicSelect = {
  certificateId: true, kind: true, title: true, recipientName: true, jobTitle: true,
  statement: true, employmentStart: true, employmentEnd: true, issuedAt: true, revokedAt: true,
  file: { select: { originalFilename: true } },
} as const;
