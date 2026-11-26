import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { backupModels, createEnvelope, digest, insertionOrder, optionalForeignKeys, scalarFields, validateBackup, type BackupPayload } from "../packages/core/src/features/backups/format";
import { compressForStorage, decompressStoredObject } from "../packages/core/src/lib/compression";

function row(modelName: string, values: Record<string, unknown>) {
  const model = backupModels.find(item => item.name === modelName)!;
  return Object.fromEntries(scalarFields(model).map(field => {
    const value = !field.isRequired ? null
      : field.kind === "enum" ? Prisma.dmmf.datamodel.enums.find(item => item.name === field.type)!.values[0].name
      : field.type === "Boolean" ? true
      : field.type === "Int" || field.type === "Float" ? 1
      : field.type === "BigInt" || field.type === "Decimal" ? "1"
      : field.type === "DateTime" ? "2026-11-26T00:00:00.000Z"
      : field.type === "Json" ? {}
      : randomUUID();
    return [field.name, Object.hasOwn(values, field.name) ? values[field.name] : value];
  }));
}

function snapshot() {
  const tables = Object.fromEntries(backupModels.map(model => [model.name, []])) as BackupPayload["tables"];
  const user = randomUUID(), role = randomUUID(), employee = randomUUID(), caseId = randomUUID(), fileId = randomUUID();
  const bytes = Buffer.from("%PDF-original-certificate\n".repeat(200));
  tables.User.push(row("User", { id: user, status: "ACTIVE", passwordHash: "$2b$12$" + "A".repeat(53) }));
  tables.Role.push(row("Role", { id: role, code: "OWNER" }));
  tables.UserRole.push(row("UserRole", { userId: user, roleId: role, revokedAt: null }));
  tables.Employee.push(row("Employee", { id: employee, userId: user, employeeCode: "2026-0005", lifecycleStatus: "ACTIVE" }));
  tables.OffboardingCase.push(row("OffboardingCase", { id: caseId, employeeId: employee }));
  tables.File.push(row("File", { id: fileId, sizeBytes: String(bytes.length), checksum: digest(bytes), mimeType: "application/pdf", scanStatus: "CLEAN" }));
  tables.EmploymentCertificate.push(row("EmploymentCertificate", { employeeId: employee, caseId, fileId, certificateId: "HV-INTERN-2026-0005", verificationAlias: "HV-" + "A".repeat(32), dobHash: "private-dob-hash" }));
  tables.EmployeeDocument.push(row("EmployeeDocument", { employeeId: employee, currentFileId: fileId, category: "Certificate", visibility: "SELF" }));
  return createEnvelope({ tables, files: [{ fileId, base64: bytes.toString("base64"), sha256: digest(bytes) }] });
}

test("backup round-trip preserves employee numbers, certificate IDs, aliases, private hashes, visibility, and exact original bytes", async () => {
  const backup = snapshot();
  const encoded = await compressForStorage(Buffer.from(JSON.stringify(backup)));
  assert.equal(encoded.encoding, "gzip");
  const decoded = await decompressStoredObject(encoded.bytes, encoded.encoding, 100*1024*1024, String(encoded.originalBytes));
  const restored = validateBackup(JSON.parse(decoded.toString()));
  assert.deepEqual(restored, backup);
  assert.equal(restored.payload.tables.Employee[0].employeeCode,"2026-0005");
  assert.equal(restored.payload.tables.EmploymentCertificate[0].certificateId,"HV-INTERN-2026-0005");
  assert.equal(restored.payload.tables.EmployeeDocument[0].visibility,"SELF");
  const certificate = backupModels.find(model=>model.name==="EmploymentCertificate")!;
  assert(optionalForeignKeys(certificate).includes("fileId"));
  const order=insertionOrder().map(model=>model.name);
  assert(order.indexOf("Employee")<order.indexOf("EmploymentCertificate"));
  assert(order.indexOf("OffboardingCase")<order.indexOf("EmploymentCertificate"));
});

test("restore rejects missing certificate originals, broken employee references, and altered file bytes", () => {
  const missingOriginal=snapshot();
  missingOriginal.payload.tables.EmploymentCertificate[0].fileId=randomUUID();
  assert.throws(()=>validateBackup(createEnvelope(missingOriginal.payload)),/missing reference from EmploymentCertificate.file/);
  const missingEmployee=snapshot();
  missingEmployee.payload.tables.EmploymentCertificate[0].employeeId=randomUUID();
  assert.throws(()=>validateBackup(createEnvelope(missingEmployee.payload)),/missing reference from EmploymentCertificate.employee/);
  const altered=snapshot();
  altered.payload.files[0].base64=Buffer.from("changed").toString("base64");
  assert.throws(()=>validateBackup(createEnvelope(altered.payload)),/size or checksum/);
});
