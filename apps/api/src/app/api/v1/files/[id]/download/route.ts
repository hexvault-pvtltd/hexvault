import { currentUser } from "@core/lib/auth";
import { canReadDocument } from "@core/features/documents/permissions";
import { db } from "@core/lib/db";
import { createPrivateDownload, StorageConfigurationError } from "@core/lib/storage";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id: fileId } = await params;
  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file) return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found." } }, { status: 404 });
  if (file.scanStatus !== "CLEAN") return NextResponse.json({ error: { code: "FILE_NOT_AVAILABLE", message: "This file has not cleared security scanning." } }, { status: 409 });
  const document = await db.employeeDocument.findFirst({ where: { OR: [{ currentFileId: fileId }, { versions: { some: { fileId } } }] } });
  const chatAttachment = await db.chatAttachment.findFirst({ where: { fileId, message: { conversation: { members: { some: { userId: actor.id, leftAt: null } } } } }, select: { id: true, message: { select: { id: true, conversationId: true } } } });
  const isChatAudio = file.mimeType.startsWith("audio/");
  const canReadChatAttachment = Boolean(chatAttachment && ["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/ogg", "audio/mp4"].includes(file.mimeType));
  const canReadEmployeeDocument = Boolean(document && canReadDocument(actor, document));
  if (!canReadChatAttachment && !canReadEmployeeDocument) return NextResponse.json({ error: { code: "NOT_FOUND", message: "File is not attached to an accessible conversation or document." } }, { status: 404 });
  try {
    const url = await createPrivateDownload(file.storageKey, file.originalFilename, canReadChatAttachment ? "inline" : "attachment", isChatAudio ? 900 : 60);
    if (canReadChatAttachment && chatAttachment) await db.auditLog.create({ data: { actorId: actor.id, action: "chat.attachment_viewed", resourceType: "chat_message", resourceId: chatAttachment.message.id, metadata: { fileId, mimeType: file.mimeType } } });
    if (canReadEmployeeDocument && document) await db.$transaction(async tx => {
      await tx.documentAccessEvent.create({ data: { documentId: document.id, actorId: actor.id, action: "DOWNLOADED" } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "employee_document.downloaded", resourceType: "employee_document", resourceId: document.id, metadata: { fileId } } });
    });
    return NextResponse.json({ data: { url, expiresInSeconds: isChatAudio ? 900 : 60 } });
  } catch (error) {
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "Private file storage is not configured." } }, { status: 503 });
    console.error("private_file_download_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "DOWNLOAD_FAILED", message: "The file could not be prepared for download." } }, { status: 500 });
  }
}
