import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const createSchema = z.union([
  z.object({ peerUserId: z.string().uuid() }).strict(),
  z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(500).optional(), memberUserIds: z.array(z.string().uuid()).min(2).max(49) }).strict().refine(value => new Set(value.memberUserIds).size === value.memberUserIds.length, "Group members must be unique."),
]);
const activeEmployee = { status: "ACTIVE" as const, employee: { is: { lifecycleStatus: { in: ["ACTIVE" as const, "ON_LEAVE" as const] } } } };

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use chat." } }, { status: 401 });
  try {
    const conversations = await db.chatConversation.findMany({
      where: { members: { some: { userId: actor.id, leftAt: null } } },
      select: {
        id: true, kind: true, name: true, description: true, createdBy: true, lastMessageAt: true,
        members: { where: { leftAt: null, user: { is: activeEmployee } }, select: { user: { select: { id: true, employee: { select: { id: true, fullName: true, employeeCode: true, title: true } } } } } },
        messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1, select: { id: true, senderId: true, body: true, createdAt: true, attachments: { select: { id: true } } } },
        voiceCalls: { where: { status: "ACTIVE" }, orderBy: { startedAt: "desc" }, take: 1, select: { id: true, participants: { where: { leftAt: null }, select: { userId: true } } } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
    });
    const pinnedMessages = await db.chatMessage.findMany({
      where: { conversationId: { in: conversations.map(item => item.id) }, isPinned: true },
      orderBy: { pinnedAt: "desc" }, take: 500,
      select: { id: true, conversationId: true, body: true, sender: { select: { employee: { select: { fullName: true } }, email: true } }, attachments: { select: { id: true } }, pinnedAt: true },
    });
    const pinnedByConversation = new Map<string, typeof pinnedMessages>();
    for (const message of pinnedMessages) pinnedByConversation.set(message.conversationId, [...(pinnedByConversation.get(message.conversationId) ?? []), message]);
    const items = conversations.flatMap(conversation => {
      const people = conversation.members.flatMap(({ user }) => user.employee ? [{ userId: user.id, employeeId: user.employee.id, fullName: user.employee.fullName, employeeCode: user.employee.employeeCode, title: user.employee.title }] : []);
      if (!people.some(person => person.userId === actor.id)) return [];
      const peer = people.find(person => person.userId !== actor.id) ?? null;
      if (conversation.kind === "DIRECT" && !peer) return [];
      const latest = conversation.messages[0];
      const activeCall = conversation.voiceCalls[0] ?? null;
      return [{
        id: conversation.id, kind: conversation.kind, name: conversation.name, description: conversation.description,
        createdBy: conversation.createdBy, peer, members: people,
        lastMessage: latest ? { ...latest, mine: latest.senderId === actor.id, hasAttachments: latest.attachments.length > 0 } : null,
        lastMessageAt: conversation.lastMessageAt,
        pinnedMessages: (pinnedByConversation.get(conversation.id) ?? []).slice(0, 10).map(message => ({ id: message.id, body: message.body, senderName: message.sender.employee?.fullName ?? message.sender.email, hasAttachments: message.attachments.length > 0, pinnedAt: message.pinnedAt })),
        activeCall: activeCall ? { id: activeCall.id, participantCount: activeCall.participants.length } : null,
      }];
    });
    return ok({ items });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use chat." } }, { status: 401 });
  try {
    const input = createSchema.parse(await request.json());
    if ("peerUserId" in input) {
      if (input.peerUserId === actor.id) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose another workspace member." } }, { status: 422 });
      const peer = await db.user.findFirst({ where: { id: input.peerUserId, ...activeEmployee }, select: { id: true, employee: { select: { id: true, fullName: true, employeeCode: true, title: true } } } });
      if (!peer?.employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Active workspace member not found." } }, { status: 404 });
      const directKey = [actor.id, peer.id].sort().join(":");
      const conversation = await db.chatConversation.upsert({ where: { directKey }, update: {}, create: { directKey, kind: "DIRECT", members: { create: [{ userId: actor.id }, { userId: peer.id }] } }, select: { id: true } });
      await db.$transaction([actor.id, peer.id].map(userId => db.chatMembership.upsert({ where: { conversationId_userId: { conversationId: conversation.id, userId } }, create: { conversationId: conversation.id, userId }, update: { leftAt: null } })));
      return ok({ item: { id: conversation.id, kind: "DIRECT", peer: { userId: peer.id, employeeId: peer.employee.id, fullName: peer.employee.fullName, employeeCode: peer.employee.employeeCode, title: peer.employee.title } } });
    }

    if (input.memberUserIds.includes(actor.id)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Do not include yourself; you will be added automatically." } }, { status: 422 });
    const activeMembers = await db.user.findMany({ where: { id: { in: input.memberUserIds }, ...activeEmployee }, select: { id: true, employee: { select: { id: true, fullName: true, employeeCode: true, title: true } } } });
    if (activeMembers.length !== input.memberUserIds.length || activeMembers.some(member => !member.employee)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Every selected member must have an active employee account." } }, { status: 422 });
    const group = await db.$transaction(async tx => {
      const created = await tx.chatConversation.create({ data: { kind: "GROUP", name: input.name, description: input.description || null, createdBy: actor.id, members: { create: [actor.id, ...input.memberUserIds].map(userId => ({ userId })) } }, select: { id: true, kind: true, name: true, description: true, createdBy: true } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "chat.group_created", resourceType: "chat_conversation", resourceId: created.id, metadata: { memberCount: input.memberUserIds.length + 1 } } });
      return created;
    });
    const people = [{ userId: actor.id, employeeId: "", fullName: "You", employeeCode: "", title: null }, ...activeMembers.map(member => ({ userId: member.id, employeeId: member.employee!.id, fullName: member.employee!.fullName, employeeCode: member.employee!.employeeCode, title: member.employee!.title }))];
    return ok({ item: { ...group, peer: null, members: people, lastMessage: null, lastMessageAt: new Date(), activeCall: null } }, 201);
  } catch (error) { return fail(error); }
}
