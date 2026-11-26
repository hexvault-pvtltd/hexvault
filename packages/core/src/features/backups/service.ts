import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@core/lib/db";
import { deletePrivateObject, readPrivateObject, writePrivateObject } from "@core/lib/storage";
import { backupModels, BackupError, type BackupEnvelope, type BackupPayload, createEnvelope, digest, insertionOrder, MAX_BACKUP_BYTES, nextScheduledRun, optionalForeignKeys, scalarFields, validateBackup } from "./format";

// Identifiers are exclusively drawn from Prisma's generated schema, never input.
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const tableName = (model: typeof backupModels[number]) => quote(model.dbName ?? model.name);
const tableList = backupModels.map(tableName).join(", ");
export const archiveSelect = { id: true, status: true, kind: true, sizeBytes: true, recordCount: true, fileCount: true, triggeredBy: true, error: true, createdAt: true, completedAt: true } as const;

async function exclusive<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>, isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.RepeatableRead) {
  return db.$transaction(async tx => {
    const [lock] = await tx.$queryRawUnsafe<{ acquired: boolean }[]>("SELECT pg_try_advisory_xact_lock(18479261) AS acquired");
    if (!lock.acquired) throw new BackupError(409, "Another backup or restore is running. Please retry after it finishes.");
    return operation(tx);
  }, { timeout: 300_000, maxWait: 10_000, isolationLevel });
}

async function capture(tx: Prisma.TransactionClient, kind: string, actorId?: string) {
  const id = randomUUID();
  const objectKey = `backups/archives/${id}.json`;
  await db.backupArchive.create({ data: { id, kind, objectKey, triggeredBy: actorId } });
  try {
    const payload: BackupPayload = { tables: {}, files: [] };
    for (const model of backupModels) {
      // PostgreSQL JSON numbers would lose BigInt/Decimal precision in JS.
      const exactFields = scalarFields(model).filter(field => ["BigInt", "Decimal"].includes(field.type));
      const overrides = exactFields.map(field => `'${field.name}', t.${quote(field.dbName ?? field.name)}::text`).join(", ");
      const rows = await tx.$queryRawUnsafe<{ row: Record<string, unknown> }[]>(`SELECT to_jsonb(t)${overrides ? ` || jsonb_build_object(${overrides})` : ""} AS row FROM ${tableName(model)} t`);
      payload.tables[model.name] = rows.map(row => row.row);
    }
    let approximateBytes = Buffer.byteLength(JSON.stringify(payload));
    if (approximateBytes > MAX_BACKUP_BYTES) throw new BackupError(413, "This backup exceeds the 100 MB JSON limit.");
    for (const file of payload.tables.File) {
      let bytes: Buffer | null = null;
      try { bytes = (await readPrivateObject(String(file.storageKey), MAX_BACKUP_BYTES)).bytes; }
      catch (error) {
        // Pending/rejected uploads can legitimately have no object yet. Never
        // silently omit a completed file or hide storage connectivity failures.
        const missing = error instanceof Error && ["NoSuchKey", "NotFound"].includes(error.name);
        if (!missing || file.scanStatus === "CLEAN") throw error;
      }
      approximateBytes += bytes ? 4 * Math.ceil(bytes.length / 3) : 0;
      if (approximateBytes > MAX_BACKUP_BYTES) throw new BackupError(413, "This backup exceeds the 100 MB JSON limit, including uploaded files.");
      payload.files.push({ fileId: String(file.id), base64: bytes?.toString("base64") ?? null, sha256: bytes ? digest(bytes) : null });
    }
    const envelope = createEnvelope(payload);
    validateBackup(envelope);
    const bytes = Buffer.from(JSON.stringify(envelope));
    if (bytes.length > MAX_BACKUP_BYTES) throw new BackupError(413, "This backup exceeds the 100 MB JSON limit.");
    const stored = await writePrivateObject(objectKey, bytes, "application/json");
    const recordCount = Object.values(payload.tables).reduce((sum, rows) => sum + rows.length, 0);
    return await db.backupArchive.update({ where: { id }, data: { status: "COMPLETED", sizeBytes: stored.storedBytes, recordCount, fileCount: payload.files.filter(file => file.base64 !== null).length, checksum: digest(bytes), completedAt: new Date() }, select: archiveSelect });
  } catch (error) {
    await db.backupArchive.update({ where: { id }, data: { status: "FAILED", error: error instanceof BackupError ? error.message : "Backup failed. Check database and private storage availability.", completedAt: new Date() } });
    throw error;
  }
}

export async function createBackup(actorId?: string, kind = "MANUAL") {
  return exclusive(async tx => {
    const archive = await capture(tx, kind, actorId);
    await tx.auditLog.create({ data: { actorId, action: "backup.created", resourceType: "backup", resourceId: archive.id, metadata: { kind } } });
    return archive;
  });
}

export async function removeBackup(id: string, actorId: string) {
  return exclusive(async tx => {
    const archive = await tx.backupArchive.findUnique({ where: { id } });
    if (!archive) throw new BackupError(404, "Backup not found.");
    if (archive.status === "RUNNING") throw new BackupError(409, "A running backup cannot be deleted.");
    await deletePrivateObject(archive.objectKey);
    await tx.backupArchive.delete({ where: { id } });
    await tx.auditLog.create({ data: { actorId, action: "backup.deleted", resourceType: "backup", resourceId: id } });
  });
}

export async function restoreBackup(backup: BackupEnvelope, actorId: string) {
  // Revalidate even when called outside an HTTP handler.
  validateBackup(backup);
  const stagedKeys: string[] = [];
  try {
    return await exclusive(async tx => {
      // Freeze application writes until the recovery copy and replacement are
      // complete. No CASCADE: unknown tables must never be silently destroyed.
      await tx.$executeRawUnsafe(`LOCK TABLE ${tableList} IN ACCESS EXCLUSIVE MODE`);
      const recovery = await capture(tx, "RECOVERY", actorId);
      const tables = structuredClone(backup.payload.tables);
      const filesById = new Map(tables.File.map(row => [String(row.id), row]));
      for (const file of backup.payload.files) {
        const record = filesById.get(file.fileId)!;
        // New immutable object keys keep existing/recovery files untouched if
        // anything fails, and never trust storage paths supplied in an upload.
        const key = `restored/${randomUUID()}/${file.fileId}`;
        record.storageKey = key;
        if (file.base64 !== null) {
          stagedKeys.push(key);
          await writePrivateObject(key, Buffer.from(file.base64, "base64"), String(record.mimeType));
        }
      }
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${tableList}`);
      for (const model of insertionOrder()) {
        const fields = scalarFields(model);
        const optionalKeys = optionalForeignKeys(model);
        const columns = fields.map(field => quote(field.dbName ?? field.name)).join(", ");
        const values = fields.map(field => optionalKeys.includes(field.name) ? "NULL" : `r.${quote(field.dbName ?? field.name)}`).join(", ");
        const rows = tables[model.name];
        for (let offset = 0; offset < rows.length; offset += 500) {
          await tx.$executeRawUnsafe(`INSERT INTO ${tableName(model)} (${columns}) SELECT ${values} FROM jsonb_populate_recordset(NULL::${tableName(model)}, $1::jsonb) r`, JSON.stringify(rows.slice(offset, offset + 500)));
        }
      }
      for (const model of backupModels) {
        const keys = optionalForeignKeys(model);
        if (!keys.length || !tables[model.name].length) continue;
        const primaryKeys = model.primaryKey?.fields ?? model.fields.filter(field => field.isId).map(field => field.name);
        if (!primaryKeys.length) throw new Error("Backup model has no primary key.");
        const assignments = keys.map(key => `${quote(key)} = r.${quote(key)}`).join(", ");
        const match = primaryKeys.map(key => `t.${quote(key)} = r.${quote(key)}`).join(" AND ");
        const rows = tables[model.name];
        for (let offset = 0; offset < rows.length; offset += 500) {
          await tx.$executeRawUnsafe(`UPDATE ${tableName(model)} t SET ${assignments} FROM jsonb_populate_recordset(NULL::${tableName(model)}, $1::jsonb) r WHERE ${match}`, JSON.stringify(rows.slice(offset, offset + 500)));
        }
      }
      // Restored credentials must not revive captured browser/reset tokens.
      await tx.session.updateMany({ data: { revokedAt: new Date() } });
      await tx.passwordResetToken.updateMany({ data: { usedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId, action: "backup.restored", resourceType: "backup", resourceId: recovery.id, metadata: { sourceCreatedAt: backup.createdAt, recoveryBackupId: recovery.id } } });
      return { recoveryBackupId: recovery.id };
    }, Prisma.TransactionIsolationLevel.ReadCommitted);
  } catch (error) {
    await Promise.allSettled(stagedKeys.map(key => deletePrivateObject(key)));
    throw error;
  }
}

export async function runScheduledBackup() {
  const result = await exclusive(async tx => {
    const schedule = await tx.backupSchedule.findUnique({ where: { id: "company" } });
    if (!schedule?.enabled || !schedule.nextRunAt || schedule.nextRunAt > new Date()) return { skipped: true, cleanupKeys: [] as string[] };
    const archive = await capture(tx, "SCHEDULED");
    await tx.backupSchedule.update({ where: { id: "company" }, data: { nextRunAt: nextScheduledRun(schedule.frequency, schedule.timeUtc) } });
    // Retention applies to successful manual/scheduled copies. Recovery copies
    // remain available until the owner explicitly deletes them.
    const old = await tx.backupArchive.findMany({ where: { status: "COMPLETED", kind: { in: ["MANUAL", "SCHEDULED"] } }, orderBy: { createdAt: "desc" }, skip: schedule.retention });
    for (const item of old) {
      await tx.backupArchive.delete({ where: { id: item.id } });
    }
    await tx.auditLog.create({ data: { action: "backup.created", resourceType: "backup", resourceId: archive.id, metadata: { kind: "SCHEDULED" } } });
    return { skipped: false, id: archive.id, cleanupKeys: old.map(item => item.objectKey) };
  }, Prisma.TransactionIsolationLevel.ReadCommitted);
  // Delete bytes only after the history transaction commits.
  await Promise.allSettled(result.cleanupKeys.map(key => deletePrivateObject(key)));
  return { skipped: result.skipped, ...("id" in result ? { id: result.id } : {}) };
}
