import { createHash, randomUUID } from "node:crypto";
import type { File } from "@prisma/client";
import { db } from "@core/lib/db";
import { deletePrivateObject, writePrivateObject } from "@core/lib/storage";

// Final uploads use fresh server-written keys. A still-valid upload URL cannot
// overwrite a file after it has passed validation and compression.
export async function finalizeValidatedFile(file: File, bytes: Buffer, actorId: string, action: string, resourceType = "file", resourceId = file.id) {
  const key = `files/${file.id}/${randomUUID()}`;
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const stored = await writePrivateObject(key, bytes, file.mimeType);
  let clean: File;
  try {
    clean = await db.$transaction(async tx => {
      const result = await tx.file.updateMany({ where: { id: file.id, storageKey: file.storageKey, scanStatus: { in: ["PENDING", "QUARANTINED"] } }, data: { scanStatus: "CLEAN", checksum, storageKey: key } });
      const latest = await tx.file.findUniqueOrThrow({ where: { id: file.id } });
      if (!result.count && latest.scanStatus !== "CLEAN") throw new Error("UPLOAD_STATE_CHANGED");
      if (result.count) await tx.auditLog.create({ data: { actorId, action, resourceType, resourceId, metadata: { originalBytes: stored.originalBytes, storedBytes: stored.storedBytes, encoding: stored.encoding } } });
      return latest;
    });
  } catch (error) {
    await deletePrivateObject(key).catch(() => undefined);
    throw error;
  }
  if (clean.storageKey !== key) await deletePrivateObject(key).catch(() => undefined);
  else await deletePrivateObject(file.storageKey).catch(() => undefined);
  return clean;
}
