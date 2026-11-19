import { timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireRole } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { createPrivateDownload, createPrivateUpload, deletePrivateObject, readPrivateObject, StorageConfigurationError } from "@core/lib/storage";
import { BackupError, digest, MAX_BACKUP_BYTES, nextScheduledRun, validateBackup } from "./format";
import { archiveSelect, createBackup, removeBackup, restoreBackup, runScheduledBackup } from "./service";

function failure(error: unknown) {
  if (error instanceof AuthError || error instanceof BackupError) return NextResponse.json({ error: { code: error instanceof AuthError ? error.code : "BACKUP_ERROR", message: error.message } }, { status: error.status });
  if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "Configure private object storage before using backups." } }, { status: 503 });
  return fail(error);
}
const uuid = z.string().uuid();
export async function listBackups() {
  try {
    await requireRole("OWNER");
    return ok(await db.backupArchive.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: archiveSelect }));
  } catch (error) { return failure(error); }
}
export async function backupNow() {
  try { const actor = await requireRole("OWNER"); return ok(await createBackup(actor.id), 201); }
  catch (error) { return failure(error); }
}
export async function deleteBackup(id: string) {
  try { const actor = await requireRole("OWNER"); await removeBackup(uuid.parse(id), actor.id); return ok({ deleted: true }); }
  catch (error) { return failure(error); }
}
export async function downloadBackup(id: string) {
  try {
    const actor = await requireRole("OWNER");
    const archive = await db.backupArchive.findUnique({ where: { id: uuid.parse(id) } });
    if (!archive || archive.status !== "COMPLETED") throw new BackupError(404, "Completed backup not found.");
    const filename = `hexvault-backup-${archive.createdAt.toISOString().replace(/[:.]/g, "-")}.json`;
    const url = await createPrivateDownload(archive.objectKey, filename);
    await db.auditLog.create({ data: { actorId: actor.id, action: "backup.downloaded", resourceType: "backup", resourceId: id } });
    return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return failure(error); }
}
const scheduleSchema = z.object({ enabled: z.boolean(), frequency: z.enum(["DAILY", "WEEKLY"]), timeUtc: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), retention: z.number().int().min(1).max(1000) }).strict();
export async function getSchedule() {
  try {
    await requireRole("OWNER");
    return ok(await db.backupSchedule.findUnique({ where: { id: "company" } }) ?? { enabled: false, frequency: "DAILY", timeUtc: "02:00", retention: 30, nextRunAt: null });
  } catch (error) { return failure(error); }
}
export async function saveSchedule(request: Request) {
  try {
    const actor = await requireRole("OWNER");
    const input = scheduleSchema.parse(await request.json());
    if (input.enabled && !process.env.CRON_SECRET) throw new BackupError(503, "Automatic backups need a server scheduler. Configure CRON_SECRET and the scheduler before enabling them.");
    const data = { ...input, nextRunAt: input.enabled ? nextScheduledRun(input.frequency, input.timeUtc) : null };
    const schedule = await db.$transaction(async tx => {
      const updated = await tx.backupSchedule.upsert({ where: { id: "company" }, create: { id: "company", ...data }, update: data });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "backup.schedule_updated", resourceType: "backup_schedule", resourceId: "company" } });
      return updated;
    });
    return ok(schedule);
  } catch (error) { return failure(error); }
}
export async function initRestoreUpload(request: Request) {
  try {
    const actor = await requireRole("OWNER");
    z.object({ size: z.number().int().positive().max(MAX_BACKUP_BYTES) }).strict().parse(await request.json());
    const uploadId = randomUUID();
    const upload = await createPrivateUpload(`backups/uploads/${actor.id}/${uploadId}.json`, "application/json", MAX_BACKUP_BYTES);
    return ok({ uploadId, upload });
  } catch (error) { return failure(error); }
}
export async function restoreFromUpload(request: Request) {
  try {
    const actor = await requireRole("OWNER");
    const input = z.object({ uploadId: uuid, password: z.string().min(1).max(200), confirmation: z.literal("RESTORE") }).strict().parse(await request.json());
    if (!await compare(input.password, actor.passwordHash)) throw new BackupError(403, "The owner password is incorrect.");
    const key = `backups/uploads/${actor.id}/${input.uploadId}.json`;
    const object = await readPrivateObject(key, MAX_BACKUP_BYTES);
    const backup = validateBackup(JSON.parse(object.bytes.toString("utf8")));
    const restored = await restoreBackup(backup, actor.id);
    // A cleanup failure must not report a committed restore as a failure.
    await deletePrivateObject(key).catch(() => undefined);
    return ok({ ...restored, message: "Restore completed. Sign in with an account from the backup." });
  } catch (error) { return failure(error); }
}
export async function scheduledBackup(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization") ?? "";
    if (!secret || !timingSafeEqual(Buffer.from(digest(auth)), Buffer.from(digest(`Bearer ${secret}`)))) throw new AuthError(401, "UNAUTHENTICATED", "Scheduler authentication required.");
    return ok(await runScheduledBackup());
  } catch (error) { return failure(error); }
}
