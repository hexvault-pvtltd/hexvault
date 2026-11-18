import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string; userId: string }> };
export async function DELETE(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to manage group members." } }, { status: 401 });
  const { id, userId } = await params;
  const group = await db.chatConversation.findFirst({ where: { id, kind: "GROUP", members: { some: { userId: actor.id, leftAt: null } } }, select: { id: true, createdBy: true } });
  if (!group) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Group not found." } }, { status: 404 });
  const isSelf = userId === actor.id;
  const mayManage = group.createdBy === actor.id || actor.roles.some(role => ["OWNER", "HR"].includes(role));
  if (!isSelf && !mayManage) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only group admins can remove another member." } }, { status: 403 });
  if (!isSelf && userId === group.createdBy && !actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "The group creator cannot be removed." } }, { status: 403 });
  const membership = await db.chatMembership.findFirst({ where: { conversationId: id, userId, leftAt: null }, select: { id: true } });
  if (!membership) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Active group member not found." } }, { status: 404 });
  await db.$transaction(async tx => {
    await tx.chatMembership.update({ where: { conversationId_userId: { conversationId: id, userId } }, data: { leftAt: new Date() } });
    await tx.chatEvent.create({ data: { conversationId: id, actorId: actor.id, type: "GROUP_UPDATED", payload: { removedMemberId: userId } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: isSelf ? "chat.group_left" : "chat.group_member_removed", resourceType: "chat_conversation", resourceId: id, metadata: { userId } } });
  });
  return NextResponse.json({ data: { removed: true } });
}
