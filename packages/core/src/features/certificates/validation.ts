import { z } from "zod";

export const certificateKinds = ["EXPERIENCE", "RELIEVING", "INTERNSHIP", "OTHER"] as const;
export const structuredCertificateId = z.string().trim().toUpperCase().max(80)
  .regex(/^HV-(INTERN|EXPERIENCE|RELIEVING|OTHER)-\d{4}-\d{4,32}(?:-\d{2,})?$/, "Use a certificate ID such as HV-INTERN-2026-0005.");
export const certificateIdSchema = z.string().trim().toUpperCase().max(80)
  .refine(value => structuredCertificateId.safeParse(value).success || /^HV-[A-F0-9]{32}$/.test(value), "Use a certificate ID such as HV-INTERN-2026-0005.");
export function certificatePrefix(kind: typeof certificateKinds[number], year: string) {
  return `HV-${kind === "INTERNSHIP" ? "INTERN" : kind}-${year}-`;
}
export function newCertificateId(kind: typeof certificateKinds[number], year: string, number: string) {
  return certificatePrefix(kind, year) + number.padStart(4, "0");
}
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
  certificateId: structuredCertificateId.optional(),
}).strict().refine(value => value.employmentStart <= value.employmentEnd, { message: "Employment end must be on or after the start date.", path: ["employmentEnd"] });
export const verifySchema = z.object({
  certificateId: certificateIdSchema,
  dateOfBirth: birthDate,
}).strict();
export function canIssueCertificates(actor: { roles: string[] }) { return actor.roles.some(role => role === "OWNER" || role === "HR"); }

// Deliberately excludes DOB hash, internal employee/case IDs and revocation actor.
export const certificatePublicSelect = {
  certificateId: true, kind: true, title: true, recipientName: true, jobTitle: true,
  statement: true, employmentStart: true, employmentEnd: true, issuedAt: true, revokedAt: true,
  file: { select: { originalFilename: true } },
} as const;
