import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export const backupModels = Prisma.dmmf.datamodel.models.filter(model => !["BackupArchive", "BackupSchedule"].includes(model.name));
export const scalarFields = (model: typeof backupModels[number]) => model.fields.filter(field => field.kind !== "object");
export const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const schemaFingerprint = digest(JSON.stringify(backupModels.map(model => ({ name: model.name, fields: scalarFields(model).map(field => [field.name, field.type, field.isRequired, field.isList]) }))));
export class BackupError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const rowSchema = z.record(z.string(), z.unknown());
const payloadSchema = z.object({
  tables: z.record(z.string(), z.array(rowSchema)),
  files: z.array(z.object({ fileId: z.string().uuid(), base64: z.string().nullable(), sha256: z.string().nullable() }).strict()),
}).strict();
const envelopeSchema = z.object({
  format: z.literal("hexvault-backup"), version: z.literal(1), scope: z.literal("APPLICATION"),
  createdAt: z.iso.datetime(), schema: z.string(), notesKeyFingerprint: z.string().nullable(),
  checksum: z.string(), payload: payloadSchema,
}).strict();
export type BackupPayload = z.infer<typeof payloadSchema>;
export type BackupEnvelope = z.infer<typeof envelopeSchema>;
export const notesKeyFingerprint = () => {
  const secret = process.env.NOTES_ENCRYPTION_KEY ?? (process.env.NODE_ENV === "production" ? undefined : process.env.AUTH_SECRET);
  return secret ? digest(secret) : null;
};
export function createEnvelope(payload: BackupPayload): BackupEnvelope {
  return { format: "hexvault-backup", version: 1, scope: "APPLICATION", createdAt: new Date().toISOString(), schema: schemaFingerprint,
    notesKeyFingerprint: notesKeyFingerprint(), checksum: digest(JSON.stringify(payload)), payload };
}

// Required relations determine insert order. Optional foreign keys are restored
// in a second pass to handle cycles (Employee <-> Department, message replies).
export function insertionOrder() {
  const ordered: typeof backupModels = [];
  const remaining = [...backupModels];
  while (remaining.length) {
    const index = remaining.findIndex(model => model.fields.filter(field => field.kind === "object" && field.relationFromFields?.length && field.isRequired)
      .every(field => ordered.some(done => done.name === field.type)));
    if (index < 0) throw new Error("Backup schema has a required foreign-key cycle.");
    ordered.push(...remaining.splice(index, 1));
  }
  return ordered;
}
export function optionalForeignKeys(model: typeof backupModels[number]) {
  return model.fields.filter(field => field.kind === "object" && field.relationFromFields?.length && !field.isRequired).flatMap(field => field.relationFromFields ?? []);
}

export function validateBackup(input: unknown): BackupEnvelope {
  const result = envelopeSchema.safeParse(input);
  if (!result.success) throw new BackupError(422, "Choose a valid HEXVAULT JSON backup file.");
  const backup = result.data;
  if (backup.schema !== schemaFingerprint) throw new BackupError(422, "This backup uses a different database schema. Restore it using the matching application version.");
  if (backup.checksum !== digest(JSON.stringify(backup.payload))) throw new BackupError(422, "Backup checksum failed. The file is incomplete or has been changed.");
  const tables = backup.payload.tables;
  if (Object.keys(tables).length !== backupModels.length || backupModels.some(model => !Object.hasOwn(tables, model.name))) throw new BackupError(422, "The backup must contain every application table.");
  for (const model of backupModels) {
    const fields = scalarFields(model);
    for (const row of tables[model.name]) {
      if (Object.keys(row).length !== fields.length || fields.some(field => !Object.hasOwn(row, field.name))) throw new BackupError(422, `Invalid fields in ${model.name}.`);
      for (const field of fields) {
        const value = row[field.name];
        if (value === null && !field.isRequired) continue;
        const valid = field.type === "Json" ? value !== undefined
          : field.kind === "enum" ? Prisma.dmmf.datamodel.enums.find(item => item.name === field.type)?.values.some(item => item.name === value)
          : field.type === "Boolean" ? typeof value === "boolean"
          : field.type === "Int" ? Number.isInteger(value)
          : field.type === "Float" ? typeof value === "number" && Number.isFinite(value)
          : field.type === "BigInt" ? typeof value === "string" && /^-?\d+$/.test(value)
          : field.type === "Decimal" ? typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)
          : field.type === "DateTime" ? typeof value === "string" && Number.isFinite(Date.parse(value))
          : typeof value === "string";
        if (!valid) throw new BackupError(422, `Invalid value for ${model.name}.${field.name}.`);
      }
    }
  }
  // Prevent a successful restore from leaving the installation without a usable owner.
  const owners = tables.Role.filter(row => row.code === "OWNER").map(row => row.id);
  const ownerIds = tables.UserRole.filter(row => owners.includes(row.roleId) && row.revokedAt === null).map(row => row.userId);
  if (!tables.User.some(row => ownerIds.includes(row.id) && row.status === "ACTIVE" && typeof row.passwordHash === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(row.passwordHash)
    && !tables.Employee.some(employee => employee.userId === row.id && ["SUSPENDED", "EXITED"].includes(String(employee.lifecycleStatus))))) throw new BackupError(422, "The backup must contain an active owner account with a password.");
  if ((tables.ManagementNote.length || tables.ManagementNoteRevision.length) && (!backup.notesKeyFingerprint || backup.notesKeyFingerprint !== notesKeyFingerprint())) throw new BackupError(422, "The management notes encryption key does not match. Configure the original NOTES_ENCRYPTION_KEY before restoring.");
  const ids = new Set<string>();
  if (backup.payload.files.length !== tables.File.length) throw new BackupError(422, "The backup file inventory is incomplete.");
  for (const file of backup.payload.files) {
    const record = tables.File.find(row => row.id === file.fileId);
    if (!record || ids.has(file.fileId)) throw new BackupError(422, "The backup file inventory is invalid.");
    ids.add(file.fileId);
    if (file.base64 === null) {
      if (record.scanStatus === "CLEAN" || file.sha256 !== null) throw new BackupError(422, "An uploaded file is missing from the backup.");
      continue;
    }
    const bytes = Buffer.from(file.base64, "base64");
    if (bytes.toString("base64") !== file.base64 || BigInt(bytes.length) !== BigInt(String(record.sizeBytes)) || digest(bytes) !== file.sha256 || (record.checksum && record.checksum !== file.sha256)) throw new BackupError(422, "An uploaded file failed size or checksum validation.");
  }
  return backup;
}

export function nextScheduledRun(frequency: string, timeUtc: string, now = new Date()) {
  const [hour, minute] = timeUtc.split(":").map(Number);
  const next = new Date(now);
  next.setUTCHours(hour, minute, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + (frequency === "WEEKLY" ? 7 : 1));
  return next;
}
