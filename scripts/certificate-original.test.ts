import assert from "node:assert/strict";
import { test } from "node:test";
import { hash } from "bcryptjs";
import { db } from "../packages/core/src/lib/db";
import { issueCertificate, verifyCertificate } from "../packages/core/src/features/certificates/service";
import { employeeCodeSchema, nextEmployeeNumber } from "../packages/core/src/features/employees/numbering";
import { certificateIdSchema, newCertificateId, structuredCertificateId } from "../packages/core/src/features/certificates/validation";
import type { Prisma } from "@prisma/client";

const certificateId = "HV-" + "A".repeat(32);
const documentId = "00000000-0000-4000-8000-000000000001";
const input = { kind: "EXPERIENCE", title: "Experience certificate", jobTitle: "Developer", statement: "This confirms the employee's period of service.", dateOfBirth: "1990-01-01", employmentStart: "2020-01-01", employmentEnd: "2021-01-01", documentId };

test("certificate originals must belong to the employee, be verified, and be readable by the issuer", async () => {
  let document = { employeeId: "employee", visibility: "SELF", currentFileId: "file-1", currentFile: { scanStatus: "CLEAN" } };
  let attached: string | null = null;
  let issuedId="";
  const existing:{certificateId:string}[]=[];
  const tx = {
    $executeRaw: async () => 1,
    offboardingCase: { findUnique: async () => ({ status: "COMPLETE", effectiveDate: new Date("2021-01-01"), employeeId: "employee", employee: { fullName: "Test Employee", employeeCode: "2026-0005" } }) },
    employeeDocument: { findUnique: async () => document },
    employmentCertificate: { findMany:async()=>existing, create: async ({ data }: { data: { fileId: string | null; certificateId:string } }) => { attached = data.fileId; issuedId=data.certificateId; return data; } },
    employeeHistory: { create: async () => ({}) }, auditLog: { create: async () => ({}) },
  };
  const database = { $transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx) } as unknown as typeof db;
  const actor = { id: "issuer", roles: ["HR"] };
  await issueCertificate(actor, "case", input, database);
  assert.equal(attached, "file-1");
  assert.equal(issuedId,"HV-EXPERIENCE-2021-0005");
  existing.push({certificateId:issuedId});
  await issueCertificate(actor,"case",input,database);
  assert.equal(issuedId,"HV-EXPERIENCE-2021-0005-02");
  await assert.rejects(issueCertificate(actor,"case",{...input,certificateId:"HV-EXPERIENCE-2021-0005"},database),/already in use/);
  for (const change of [{ employeeId: "someone-else" }, { visibility: "OWNER" }, { currentFile: { scanStatus: "QUARANTINED" } }]) {
    const previous = document;
    document = { ...document, ...change };
    await assert.rejects(issueCertificate(actor, "case", input, database), /Choose a verified document/);
    document = previous;
  }
});

test("only successful, non-revoked verification receives an expiring original download", async () => {
  const dobHash = await hash(`${certificateId}:1990-01-01`, 4);
  let storedCertificateId = certificateId;
  let verificationAlias: string | null = null;
  let revokedAt: Date | null = null;
  const tx = { certificateVerificationLimit: { deleteMany: async () => ({}), upsert: async () => ({ count: 1 }) } };
  const database = {
    $transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx),
    employmentCertificate: { findFirst: async () => ({ certificateId: storedCertificateId, verificationAlias, dobHash, revokedAt, title: "Experience", file: { storageKey: "private/original", originalFilename: "certificate.pdf", scanStatus: "CLEAN" } }) },
  } as unknown as typeof db;
  await assert.rejects(verifyCertificate({ certificateId, dateOfBirth: "1990-01-02" }, "test", database), /could not be verified/);
  revokedAt = new Date();
  assert.deepEqual(await verifyCertificate({ certificateId, dateOfBirth: "1990-01-01" }, "test", database), { status: "REVOKED", certificateId });
  revokedAt = null;
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { S3_BUCKET: "test", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test", S3_ENDPOINT: "https://test.r2.cloudflarestorage.com", S3_REGION: "auto" });
    delete process.env.S3_PUBLIC_ENDPOINT;
    const result = await verifyCertificate({ certificateId, dateOfBirth: "1990-01-01" }, "test", database);
    assert.equal(result.status, "VERIFIED");
    if (result.status !== "VERIFIED") throw new Error("Expected verification");
    assert.equal(result.original?.expiresInSeconds, 300);
    assert.equal(new URL(result.original!.url).searchParams.get("X-Amz-Expires"), "300");
    assert(!("dobHash" in result));
    assert(!("file" in result));
    storedCertificateId = "HV-INTERN-2026-0005";
    verificationAlias = certificateId;
    for (const lookupId of [storedCertificateId, certificateId]) {
      const migrated = await verifyCertificate({certificateId:lookupId,dateOfBirth:"1990-01-01"},"test",database);
      assert.equal(migrated.status,"VERIFIED");
      assert.equal(migrated.certificateId,storedCertificateId);
      assert(!("verificationAlias" in migrated));
    }
    revokedAt=new Date();
    assert.deepEqual(await verifyCertificate({certificateId:storedCertificateId,dateOfBirth:"1990-01-01"},"test",database),{status:"REVOKED",certificateId:storedCertificateId});
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("readable certificate IDs accept the requested format while legacy links remain valid", () => {
  assert.equal(newCertificateId("INTERNSHIP","2026","5"),"HV-INTERN-2026-0005");
  assert.equal(newCertificateId("EXPERIENCE","2026","0005"),"HV-EXPERIENCE-2026-0005");
  assert.equal(structuredCertificateId.parse("hv-intern-2026-0005"),"HV-INTERN-2026-0005");
  assert(certificateIdSchema.safeParse(certificateId).success);
  assert(certificateIdSchema.safeParse("HV-INTERN-2026-0005-02").success);
  assert(!certificateIdSchema.safeParse("HV-INTERN-2026-5").success);
  assert(!certificateIdSchema.safeParse("HV-INTERN-2026-0005<script>").success);
});

test("employee numbers preserve leading zeros and continue after existing numeric codes", async () => {
  assert.equal(employeeCodeSchema.parse("1"), "0001");
  assert.equal(employeeCodeSchema.parse("0002"), "0002");
  assert.equal(employeeCodeSchema.parse("OWN-001"), "OWN-0001");
  assert.equal(employeeCodeSchema.parse("2026-005"), "2026-0005");
  assert.equal(employeeCodeSchema.parse("2026-0005"), "2026-0005");
  assert.equal(employeeCodeSchema.parse("10000"), "10000");
  assert.equal(employeeCodeSchema.parse("STAFF"), "STAFF");
  for (const [maximum, expected] of [["0", "0001"], ["9", "0010"], ["9999", "10000"]]) {
    const tx = { $queryRaw: async () => [{ maximum }] } as unknown as Prisma.TransactionClient;
    assert.equal(await nextEmployeeNumber(tx), expected);
  }
});
