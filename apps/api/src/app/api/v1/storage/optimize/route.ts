import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AuthError, requireRole } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { StorageConfigurationError } from "@core/lib/storage";
import { optimizeStoredFile, StorageBusyError } from "@core/features/files/optimize";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;
const schema = z.object({ phase: z.enum(["FILES", "BACKUPS"]).default("FILES"), cursor: z.string().uuid().nullable().optional() }).strict();
export async function POST(request: Request) {
  try {
    const actor = await requireRole("OWNER");
    const { cursor, phase } = schema.parse(await request.json());
    const rows = phase === "FILES"
      ? await db.file.findMany({ where: { scanStatus: "CLEAN", ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take: 6, select: { id: true } })
      : await db.backupArchive.findMany({ where: { status: "COMPLETED", ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take: 6, select: { id: true } });
    let processed = 0, originalBytes = 0, storedBytes = 0, changed = 0;
    const errors: string[] = [];
    for (const row of rows.slice(0, 5)) {
      try {
        const result = await optimizeStoredFile(row.id, actor.id, phase === "BACKUPS");
        if (result) { processed++; originalBytes += result.originalBytes; storedBytes += result.storedBytes; if (result.changed) changed++; }
      } catch (error) {
        if (error instanceof StorageBusyError || error instanceof StorageConfigurationError) throw error;
        console.error("storage_optimization_failed", { id: row.id, phase, error: error instanceof Error ? error.name : "unknown" });
        errors.push(`${phase === "FILES" ? "File" : "Backup"} ${row.id} could not be optimized. Its existing reference was kept.`);
      }
    }
    const more = rows.length > 5;
    return ok({ processed, changed, originalBytes, storedBytes, errors, nextCursor: more ? rows[4].id : null, nextPhase: more ? phase : "BACKUPS", done: !more && phase === "BACKUPS" });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if (error instanceof StorageBusyError) return NextResponse.json({ error: { code: "STORAGE_BUSY", message: error.message } }, { status: 409 });
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "Configure private object storage before optimizing files." } }, { status: 503 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) return NextResponse.json({ error: { code: "DATABASE_UPDATE_REQUIRED", message: "Uploaded files were processed, but backups need a database update. Apply the pending database migrations, then optimize again." } }, { status: 503 });
    return fail(error);
  }
}
