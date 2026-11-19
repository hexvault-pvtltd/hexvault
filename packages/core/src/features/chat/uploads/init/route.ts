import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { createPrivateUpload, StorageConfigurationError } from "@core/lib/storage";
import { NextRequest, NextResponse } from "next/server";

const imageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const audioTypes = ["audio/webm", "audio/ogg", "audio/mp4"] as const;
const schema = z.object({ conversationId: z.string().uuid(), originalFilename: z.string().trim().min(1).max(180).refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Invalid filename."), mimeType: z.enum([...imageTypes, ...audioTypes]), sizeBytes: z.number().int().min(1).max(8 * 1024 * 1024) }).strict().refine(input => input.mimeType.startsWith("audio/") || input.sizeBytes <= 5 * 1024 * 1024, { message: "Chat images must be no larger than 5 MB." });

export async function POST(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to upload a chat image." } }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const member = await db.chatMembership.findFirst({ where: { conversationId: input.conversationId, userId: actor.id, leftAt: null }, select: { id: true } });
    if (!member) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    const storageKey = `quarantine/chat/${input.conversationId}/${randomUUID()}`;
    const file = await db.file.create({ data: { storageKey, originalFilename: input.originalFilename.replace(/[/\\]/g, "_").trim(), mimeType: input.mimeType, sizeBytes: BigInt(input.sizeBytes), uploadedBy: actor.id, scanStatus: "PENDING" } });
    try {
      const maxBytes = input.mimeType.startsWith("audio/") ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
      const upload = await createPrivateUpload(storageKey, input.mimeType, maxBytes);
      return NextResponse.json({ data: { fileId: file.id, uploadUrl: upload.url, fields: upload.fields, maxBytes, expiresInSeconds: 600 } }, { status: 201 });
    } catch (error) { await db.file.delete({ where: { id: file.id } }); throw error; }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose an image up to 5 MB or a WebM, Ogg, or MP4 voice note up to 8 MB." } }, { status: 422 });
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "Private chat storage is not configured." } }, { status: 503 });
    console.error("chat_attachment_upload_init_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The chat attachment upload could not be started." } }, { status: 500 });
  }
}
