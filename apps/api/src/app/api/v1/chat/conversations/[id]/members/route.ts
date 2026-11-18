import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ userIds: z.array(z.string().uuid()).min(1).max(49) }).strict().refine(value => new Set(value.userIds).size === value.userIds.length, "Member IDs must be unique.");
const activeUsers = { status: "ACTIVE" as const, employee: { is: { lifecycleStatus: { in: ["ACTIVE" as const, "ON_LEAVE" as const] } } } };
function canManage(actor: { id: string; roles: string[] }, createdBy: string | null) { return actor.id === createdBy || actor.roles.some(role => ["OWNER", "HR"].includes(role)); }

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to add members." } }, { status: 401 });
  try {
    const { id } = await params;
    const input = schema.parse(await request.json());
    const group = await db.chatConversation.findFirst({ where: { id, kind: "GROUP", members: { some: { userId: actor.id, leftAt: null } } }, select: { id: true, createdBy: true } });
    if (!group) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Group not found." } }, { status: 404 });
    if (!canManage(actor, group.createdBy)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the group creator, HR, or Owner can add members." } }, { status: 403 });
    const userIds = input.userIds.filter(id => id !== actor.id);
    const active = await db.user.findMany({ where: { id: { in: userIds }, ...activeUsers }, select: { id: true } });
    if (active.length !== userIds.length) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Every selected account must be active." } }, { status: 422 });
    await db.$transaction(async tx => {
      for (const userId of userIds) await tx.chatMembership.upsert({ where: { conversationId_userId: { conversationId: id, userId } }, create: { conversationId: id, userId }, update: { leftAt: null, joinedAt: new Date() } });
      await tx.chatEvent.create({ data: { conversationId: id, actorId: actor.id, type: "GROUP_UPDATED", payload: { addedMemberIds: userIds } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "chat.group_members_added", resourceType: "chat_conversation", resourceId: id, metadata: { count: userIds.length } } });
    });
    return ok({ added: userIds.length });
  } catch (error) { return fail(error); }
}
