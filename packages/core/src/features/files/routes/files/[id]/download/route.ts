import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { createPrivateDownload, StorageConfigurationError } from "@core/lib/storage";
import { fileAccess, previewableTypes } from "@core/features/files/access";
import { fail } from "@core/lib/http";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const fileId = z.string().uuid().parse((await params).id);
    const file = await db.file.findUnique({ where: { id: fileId } });
    if (!file) return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found." } }, { status: 404 });
    if (file.scanStatus !== "CLEAN") return NextResponse.json({ error: { code: "FILE_NOT_AVAILABLE", message: "This file has not cleared security scanning." } }, { status: 409 });
    const access = await fileAccess(actor, fileId);
    if (!access.allowed) return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found." } }, { status: 404 });
    const query = new URL(request.url).searchParams;
    const preview = query.get("preview") === "1";
    const previewable = previewableTypes.has(file.mimeType.toLowerCase());
    const forceDownload = query.get("download") === "1";
    const inline = previewable && !forceDownload && (preview || Boolean(access.chat));
    const expiresInSeconds = 900;
    const url = await createPrivateDownload(file.storageKey, file.originalFilename, inline ? "inline" : "attachment", expiresInSeconds);
    if (access.document) await db.$transaction(async tx => {
      await tx.documentAccessEvent.create({ data: { documentId: access.document!.id, actorId: actor.id, action: preview ? "PREVIEWED" : "DOWNLOADED" } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: preview ? "employee_document.previewed" : "employee_document.downloaded", resourceType: "employee_document", resourceId: access.document!.id, metadata: { fileId } } });
    });
    if (access.chat) await db.auditLog.create({ data: { actorId: actor.id, action: "chat.attachment_viewed", resourceType: "chat_message", resourceId: access.chat.messageId, metadata: { fileId, mimeType: file.mimeType } } });
    return NextResponse.json({ data: { url, expiresInSeconds, previewable, mimeType: file.mimeType, filename: file.originalFilename, sizeBytes: Number(file.sizeBytes) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "Private file storage is not configured." } }, { status: 503 });
    return fail(error);
  }
}
