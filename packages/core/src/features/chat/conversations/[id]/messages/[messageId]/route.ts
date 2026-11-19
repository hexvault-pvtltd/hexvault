import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string; messageId: string }> };
const schema = z.object({ isPinned: z.boolean() }).strict();

export async function PATCH(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to manage pinned messages." } }, { status: 401 });
  try {
    const { id: conversationId, messageId } = await params;
    const { isPinned } = schema.parse(await request.json());
    if (!await db.chatMembership.findFirst({ where: { conversationId, userId: actor.id, leftAt: null }, select: { id: true } })) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    const message = await db.chatMessage.findFirst({ where: { id: messageId, conversationId }, select: { id: true } });
    if (!message) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Message not found." } }, { status: 404 });
    await db.$transaction(async tx => {
      await tx.chatMessage.update({ where: { id: messageId }, data: { isPinned, pinnedAt: isPinned ? new Date() : null, pinnedBy: isPinned ? actor.id : null } });
      await tx.chatEvent.create({ data: { conversationId, actorId: actor.id, type: "MESSAGE_UPDATED", payload: { messageId } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: isPinned ? "chat.message_pinned" : "chat.message_unpinned", resourceType: "chat_message", resourceId: messageId, metadata: { conversationId } } });
    });
    return ok({ messageId, isPinned });
  } catch (error) { return fail(error); }
}
