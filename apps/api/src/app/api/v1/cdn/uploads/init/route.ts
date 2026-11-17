import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { canUploadToCdnFolder } from "@core/features/cdn/permissions";
import { createPrivateUpload, MAX_CDN_UPLOAD_BYTES, StorageConfigurationError } from "@core/lib/storage";
import { fail } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ folderId: z.string().uuid(), originalFilename: z.string().trim().min(1).max(180).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Invalid filename."), mimeType: z.string().trim().min(1).max(160), sizeBytes: z.number().int().min(1).max(MAX_CDN_UPLOAD_BYTES) }).strict();

export async function POST(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const folder = await db.cdnFolder.findUnique({ where: { id: input.folderId }, select: { id: true, active: true } });
    if (!folder || !folder.active) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN folder not found." } }, { status: 404 });
    if (!await canUploadToCdnFolder(actor, folder.id)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have upload access to this CDN folder." } }, { status: 403 });
    const storageKey = `cdn-quarantine/${randomUUID()}`;
    const file = await db.$transaction(async tx => {
      const record = await tx.file.create({ data: { storageKey, originalFilename: input.originalFilename.replace(/[/\\]/g, "_").trim(), mimeType: input.mimeType, sizeBytes: BigInt(input.sizeBytes), uploadedBy: actor.id, scanStatus: "PENDING" } });
      const asset = await tx.cdnAsset.create({ data: { folderId: folder.id, fileId: record.id } });
      return { record, asset };
    });
    try {
      const post = await createPrivateUpload(storageKey, input.mimeType, MAX_CDN_UPLOAD_BYTES + 1024 * 1024);
      return NextResponse.json({ data: { assetId: file.asset.id, fileId: file.record.id, uploadUrl: post.url, fields: post.fields, expiresInSeconds: 600, maxBytes: MAX_CDN_UPLOAD_BYTES } }, { status: 201 });
    } catch (error) {
      await db.$transaction(async tx => { await tx.cdnAsset.delete({ where: { id: file.asset.id } }); await tx.file.delete({ where: { id: file.record.id } }); });
      throw error;
    }
  } catch (error) {
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "CDN storage is not configured." } }, { status: 503 });
    const invalid = fail(error);
    if (invalid.status === 422) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check the file name, type, and size (maximum 50 MB)." } }, { status: 422 });
    console.error("cdn_upload_init_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The CDN upload could not be initialized." } }, { status: 500 });
  }
}
