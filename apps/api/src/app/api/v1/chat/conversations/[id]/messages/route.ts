import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const messageSchema = z.object({ body: z.string().trim().max(4000).default(""), clientMessageId: z.string().uuid(), fileIds: z.array(z.string().uuid()).max(4).default([]) }).strict().refine(value => value.body.length > 0 || value.fileIds.length > 0, "A message needs text or an attachment.");
const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), beforeAt: z.iso.datetime().optional(), beforeId: z.string().uuid().optional(), messageId: z.string().uuid().optional() }).strict().refine(value => Boolean(value.beforeAt) === Boolean(value.beforeId), "Both message cursor fields are required together.");
async function requireMembership(conversationId: string, userId: string) { return db.chatMembership.findFirst({ where: { conversationId, userId, leftAt: null }, select: { id: true } }); }
function unauthorized() { return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use chat." } }, { status: 401 }); }
function serialize(message: { id: string; clientMessageId: string | null; senderId: string; sender: { email: string; employee: { fullName: string } | null }; body: string; createdAt: Date; isPinned: boolean; attachments: { id: string; file: { id: string; originalFilename: string; mimeType: string; sizeBytes: bigint } }[]; reactions: { emoji: string; userId: string }[] }, actorId: string) {
  const reactions = Object.groupBy(message.reactions, item => item.emoji);
  return { id: message.id, clientMessageId: message.clientMessageId, senderId: message.senderId, senderName: message.sender.employee?.fullName ?? message.sender.email, body: message.body, createdAt: message.createdAt, mine: message.senderId === actorId, isPinned: message.isPinned, attachments: message.attachments.map(item => ({ id: item.file.id, filename: item.file.originalFilename, mimeType: item.file.mimeType, sizeBytes: Number(item.file.sizeBytes), url: `/api/v1/files/${item.file.id}/download` })), reactions: Object.entries(reactions).map(([emoji, items]) => ({ emoji, count: items!.length, reacted: items!.some(item => item.userId === actorId) })) };
}
const messageInclude = { sender: { select: { id: true, email: true, employee: { select: { fullName: true } } } }, attachments: { where: { file: { scanStatus: "CLEAN" } }, select: { id: true, file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true } } } }, reactions: { select: { emoji: true, userId: true } } } as const;

export async function GET(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  try {
    const { id: conversationId } = await params;
    if (!await requireMembership(conversationId, actor.id)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    const parsed = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const cursorDate = parsed.beforeAt ? new Date(parsed.beforeAt) : null;
    const messages = await db.chatMessage.findMany({ where: { conversationId, ...(parsed.messageId ? { id: parsed.messageId } : cursorDate && parsed.beforeId ? { OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: parsed.beforeId } }] } : {}) }, include: messageInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: parsed.messageId ? 1 : parsed.limit });
    await db.chatMembership.update({ where: { conversationId_userId: { conversationId, userId: actor.id } }, data: { lastReadAt: new Date() } });
    const items = messages.reverse().map(message => serialize(message, actor.id));
    return ok({ items, hasMore: messages.length === parsed.limit, nextCursor: items[0] ? { beforeAt: items[0].createdAt.toISOString(), beforeId: items[0].id } : null });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  try {
    const { id: conversationId } = await params;
    const input = messageSchema.parse(await request.json());
    if (!await requireMembership(conversationId, actor.id)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    const recipients = await db.chatMembership.count({
      where: {
        conversationId,
        userId: { not: actor.id },
        leftAt: null,
        user: { is: { status: "ACTIVE", employee: { is: { lifecycleStatus: { in: ["ACTIVE", "ON_LEAVE"] } } } } },
      },
    });
    if (!recipients) return NextResponse.json({ error: { code: "CONFLICT", message: "This conversation has no other active members and is read-only." } }, { status: 409 });
    if (input.fileIds.length) {
      const files = await db.file.findMany({ where: { id: { in: input.fileIds }, uploadedBy: actor.id, scanStatus: "CLEAN", mimeType: { in: ["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/ogg", "audio/mp4"] }, chatAttachment: null }, select: { id: true } });
      if (files.length !== input.fileIds.length) return NextResponse.json({ error: { code: "INVALID_ATTACHMENT", message: "One or more attachments are still scanning, unavailable, or not yours to attach." } }, { status: 422 });
    }
    const saved = await db.$transaction(async tx => {
      const existing = await tx.chatMessage.findUnique({ where: { senderId_clientMessageId: { senderId: actor.id, clientMessageId: input.clientMessageId } }, include: messageInclude });
      if (existing) {
        if (existing.conversationId !== conversationId) throw new Error("MESSAGE_ID_REUSED");
        return existing;
      }
      const message = await tx.chatMessage.create({ data: { conversationId, senderId: actor.id, clientMessageId: input.clientMessageId, body: input.body || "", attachments: { create: input.fileIds.map(fileId => ({ fileId })) } }, include: messageInclude });
      await tx.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
      await tx.chatEvent.create({ data: { conversationId, actorId: actor.id, type: "MESSAGE_CREATED", payload: { messageId: message.id } } });
      return message;
    });
    return ok({ item: serialize(saved, actor.id) }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "MESSAGE_ID_REUSED") return NextResponse.json({ error: { code: "CONFLICT", message: "Message identifier was already used." } }, { status: 409 });
    return fail(error);
  }
}
