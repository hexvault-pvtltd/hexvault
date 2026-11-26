import { createHash } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { canUploadToCdnFolder } from "@core/features/cdn/permissions";
import { finalizeValidatedFile } from "@core/features/files/finalize";
import { MAX_CDN_UPLOAD_BYTES, readPrivateObject, StorageConfigurationError } from "@core/lib/storage";
import { fail } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ fileId: z.string().uuid(), sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional() }).strict();

export async function POST(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const asset = await db.cdnAsset.findUnique({ where: { fileId: input.fileId }, include: { file: true, folder: { select: { id: true, active: true } } } });
    if (!asset) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN upload record not found." } }, { status: 404 });
    if (!asset.folder.active) return NextResponse.json({ error: { code: "CONFLICT", message: "The CDN folder is archived." } }, { status: 409 });
    if (asset.file.uploadedBy !== actor.id || !await canUploadToCdnFolder(actor, asset.folderId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot complete this upload." } }, { status: 403 });
    if (asset.file.scanStatus === "CLEAN") return NextResponse.json({ data: { fileId: asset.file.id, assetId: asset.id, scanStatus: "CLEAN", checksum: asset.file.checksum, sizeBytes: Number(asset.file.sizeBytes) } });
    if (asset.file.scanStatus === "REJECTED") return NextResponse.json({ error: { code: "UNPROCESSABLE_FILE", message: "This file failed security validation." } }, { status: 422 });

    const object = await readPrivateObject(asset.file.storageKey, MAX_CDN_UPLOAD_BYTES);
    const digest = createHash("sha256").update(object.bytes).digest("hex");
    const receivedType = object.contentType.split(";")[0].trim().toLowerCase();
    if (object.contentLength !== Number(asset.file.sizeBytes) || receivedType !== asset.file.mimeType.toLowerCase() || (input.sha256 && input.sha256.toLowerCase() !== digest)) {
      await db.file.update({ where: { id: asset.file.id }, data: { scanStatus: "REJECTED" } });
      await db.auditLog.create({ data: { actorId: actor.id, action: "cdn.upload_rejected", resourceType: "cdn_asset", resourceId: asset.id, metadata: { reason: "UPLOAD_METADATA_MISMATCH" } } });
      return NextResponse.json({ error: { code: "UNPROCESSABLE_FILE", message: "File type, size, or checksum did not match the upload request." } }, { status: 422 });
    }

    const clean = await finalizeValidatedFile(asset.file, object.bytes, actor.id, "cdn.upload_validated", "cdn_asset", asset.id);
    return NextResponse.json({ data: { fileId: clean.id, assetId: asset.id, scanStatus: clean.scanStatus, checksum: clean.checksum, sizeBytes: Number(clean.sizeBytes) } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check the upload completion fields." } }, { status: 422 });
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "CDN storage is not configured." } }, { status: 503 });
    if (error instanceof Error && error.message === "NotFound") return NextResponse.json({ error: { code: "NOT_FOUND", message: "Uploaded object was not found." } }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_OBJECT_SIZE") return NextResponse.json({ error: { code: "UPLOAD_TOO_LARGE", message: "This CDN upload exceeds the 50 MB limit." } }, { status: 413 });
    console.error("cdn_upload_complete_failed", error instanceof Error ? error.name : "unknown");
    const response = fail(error);
    return response.status === 500 ? NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The CDN file could not be verified." } }, { status: 500 }) : response;
  }
}
