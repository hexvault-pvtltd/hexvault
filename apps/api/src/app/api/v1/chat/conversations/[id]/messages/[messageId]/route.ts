import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string; messageId: string }> };
const schema = z.object({ emoji: z.enum(["👍", "❤️", "😂", "🎉", "👀", "✅"]) }).strict();

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to react to messages." } }, { status: 401 });
  try {
    const { id: conversationId, messageId } = await params;
    const { emoji } = schema.parse(await request.json());
    const member = await db.chatMembership.findFirst({ where: { conversationId, userId: actor.id, leftAt: null }, select: { id: true } });
    if (!member) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    const message = await db.chatMessage.findFirst({ where: { id: messageId, conversationId }, select: { id: true } });
    if (!message) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Message not found." } }, { status: 404 });
    const key = { messageId_userId_emoji: { messageId, userId: actor.id, emoji } };
    const wasReacted = await db.chatReaction.findUnique({ where: key, select: { id: true } });
    const result = await db.$transaction(async tx => {
      if (wasReacted) await tx.chatReaction.deleteMany({ where: { messageId, userId: actor.id, emoji } });
      else await tx.chatReaction.createMany({ data: [{ messageId, userId: actor.id, emoji }], skipDuplicates: true });
      const reactions = await tx.chatReaction.findMany({ where: { messageId }, select: { emoji: true, userId: true } });
      const grouped = Object.groupBy(reactions, item => item.emoji);
      const values = Object.entries(grouped).map(([value, items]) => ({ emoji: value, count: items!.length, reacted: items!.some(item => item.userId === actor.id) }));
      await tx.chatEvent.create({ data: { conversationId, actorId: actor.id, type: "MESSAGE_UPDATED", payload: { messageId } } });
      return values;
    });
    return ok({ reactions: result });
  } catch (error) { return fail(error); }
}
