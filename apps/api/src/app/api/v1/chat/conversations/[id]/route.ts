import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(500).nullable().optional() }).strict().refine(value => value.name !== undefined || value.description !== undefined, "At least one group field is required.");

export async function PATCH(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to manage group details." } }, { status: 401 });
  try {
    const { id } = await params;
    const input = schema.parse(await request.json());
    const group = await db.chatConversation.findFirst({ where: { id, kind: "GROUP", members: { some: { userId: actor.id, leftAt: null } } }, select: { id: true, createdBy: true } });
    if (!group) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Group not found." } }, { status: 404 });
    if (group.createdBy !== actor.id && !actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the group creator, HR, or Owner can edit group details." } }, { status: 403 });
    const updated = await db.$transaction(async tx => {
      const result = await tx.chatConversation.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description || null } : {}) }, select: { id: true, name: true, description: true } });
      await tx.chatEvent.create({ data: { conversationId: id, actorId: actor.id, type: "GROUP_UPDATED", payload: result } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "chat.group_updated", resourceType: "chat_conversation", resourceId: id } });
      return result;
    });
    return ok({ item: updated });
  } catch (error) { return fail(error); }
}
