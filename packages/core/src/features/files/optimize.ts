import { createHash, randomUUID } from "node:crypto";
import { db } from "@core/lib/db";
import { deletePrivateObject, MAX_CDN_UPLOAD_BYTES, readPrivateObject, writePrivateObject } from "@core/lib/storage";
import { MAX_BACKUP_BYTES } from "@core/features/backups/format";

export class StorageBusyError extends Error {}
export async function optimizeStoredFile(id: string, actorId: string, backup = false) {
  let stagedKey: string | null = null;
  let oldKey: string | null = null;
  try {
    const result = await db.$transaction(async tx => {
      // Shared with backup/restore: do not move their source objects mid-copy.
      const [lock] = await tx.$queryRawUnsafe<{ acquired: boolean }[]>("SELECT pg_try_advisory_xact_lock(18479261) AS acquired");
      if (!lock.acquired) throw new StorageBusyError("A backup, restore, or storage optimization is running. Retry after it finishes.");
      const file = backup ? null : await tx.file.findUnique({ where: { id } });
      const archive = backup ? await tx.backupArchive.findUnique({ where: { id } }) : null;
      if ((!backup && file?.scanStatus !== "CLEAN") || (backup && archive?.status !== "COMPLETED")) return null;
      const key = file?.storageKey ?? archive!.objectKey;
      const object = await readPrivateObject(key, backup ? MAX_BACKUP_BYTES : MAX_CDN_UPLOAD_BYTES);
      const checksum = file?.checksum ?? archive?.checksum;
      if (checksum && createHash("sha256").update(object.bytes).digest("hex") !== checksum) throw new Error("FILE_CHECKSUM_MISMATCH");
      if (file && BigInt(object.bytes.length) !== file.sizeBytes) throw new Error("OBJECT_SIZE_MISMATCH");
      if (object.optimized) return { originalBytes: object.contentLength, storedBytes: object.storedLength, changed: false };
      stagedKey = backup ? `backups/archives/${id}-${randomUUID()}.json` : `files/${id}/${randomUUID()}`;
      const stored = await writePrivateObject(stagedKey, object.bytes, file?.mimeType ?? "application/json");
      const updated = file
        ? await tx.file.updateMany({ where: { id, storageKey: key, scanStatus: "CLEAN" }, data: { storageKey: stagedKey } })
        : await tx.backupArchive.updateMany({ where: { id, objectKey: key, status: "COMPLETED" }, data: { objectKey: stagedKey, sizeBytes: stored.storedBytes } });
      if (!updated.count) throw new Error("STORAGE_REFERENCE_CHANGED");
      await tx.auditLog.create({ data: { actorId, action: "storage.optimized", resourceType: backup ? "backup" : "file", resourceId: id, metadata: stored } });
      oldKey = key;
      return { originalBytes: stored.originalBytes, storedBytes: stored.storedBytes, changed: stored.storedBytes < stored.originalBytes };
    }, { timeout: 180_000, maxWait: 10_000 });
    if (oldKey) await deletePrivateObject(oldKey).catch(() => undefined);
    return result;
  } catch (error) {
    if (stagedKey) await deletePrivateObject(stagedKey).catch(() => undefined);
    throw error;
  }
}
