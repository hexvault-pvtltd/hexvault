import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { voiceConfiguration } from "@core/features/chat/voice-config";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ action: z.enum(["start", "join", "leave"]), callId: z.string().uuid().optional() }).strict();
function signedOut() { return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use voice calls." } }, { status: 401 }); }
async function expireStaleParticipants(conversationId: string) {
  const call = await db.chatVoiceCall.findUnique({ where: { activeConversationId: conversationId }, select: { id: true } });
  if (!call) return;
  const cutoff = new Date(Date.now() - 45_000);
  await db.chatVoiceParticipant.updateMany({ where: { callId: call.id, leftAt: null, lastSeenAt: { lt: cutoff } }, data: { leftAt: new Date() } });
  const active = await db.chatVoiceParticipant.count({ where: { callId: call.id, leftAt: null } });
  if (!active) await db.chatVoiceCall.updateMany({ where: { id: call.id, status: "ACTIVE" }, data: { status: "ENDED", endedAt: new Date(), activeConversationId: null } });
}

export async function GET(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return signedOut();
  try {
    const { id: conversationId } = await params;
    if (!await db.chatMembership.findFirst({ where: { conversationId, userId: actor.id, leftAt: null }, select: { id: true } })) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    await expireStaleParticipants(conversationId);
    const call = await db.chatVoiceCall.findUnique({ where: { activeConversationId: conversationId }, select: { id: true, status: true, startedAt: true, participants: { where: { leftAt: null }, select: { userId: true, user: { select: { employee: { select: { fullName: true } }, email: true } } } } } });
    return ok({ item: call ? { id: call.id, status: call.status, startedAt: call.startedAt, participants: call.participants.map(person => ({ userId: person.userId, name: person.user.employee?.fullName ?? person.user.email })) } : null });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return signedOut();
  try {
    const { id: conversationId } = await params;
    const { action, callId } = schema.parse(await request.json());
    const member = await db.chatMembership.findFirst({ where: { conversationId, userId: actor.id, leftAt: null, user: { is: { status: "ACTIVE", employee: { is: { lifecycleStatus: { in: ["ACTIVE", "ON_LEAVE"] } } } } } }, select: { id: true } });
    if (!member) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found or your account is inactive." } }, { status: 404 });
    if (action !== "leave") await expireStaleParticipants(conversationId);
    if (action === "leave") {
      const call = await db.chatVoiceCall.findFirst({ where: { activeConversationId: conversationId, ...(callId ? { id: callId } : {}) }, select: { id: true } });
      if (!call) return ok({ item: null });
      await db.$transaction(async tx => {
        await tx.chatVoiceParticipant.updateMany({ where: { callId: call.id, userId: actor.id, leftAt: null }, data: { leftAt: new Date() } });
        const remaining = await tx.chatVoiceParticipant.count({ where: { callId: call.id, leftAt: null } });
        if (!remaining) await tx.chatVoiceCall.update({ where: { id: call.id }, data: { status: "ENDED", endedAt: new Date(), activeConversationId: null } });
        await tx.chatEvent.create({ data: { conversationId, actorId: actor.id, type: remaining ? "CALL_UPDATED" : "CALL_ENDED", payload: { callId: call.id } } });
      });
      return ok({ item: null });
    }

    const configuration = voiceConfiguration(actor.id);
    let call = await db.chatVoiceCall.findUnique({ where: { activeConversationId: conversationId }, select: { id: true } });
    if (!call) {
      try { call = await db.chatVoiceCall.create({ data: { conversationId, activeConversationId: conversationId, startedBy: actor.id, participants: { create: { userId: actor.id } } }, select: { id: true } }); }
      catch (error) {
        if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")) throw error;
        call = await db.chatVoiceCall.findUniqueOrThrow({ where: { activeConversationId: conversationId }, select: { id: true } });
      }
      await db.chatEvent.create({ data: { conversationId, actorId: actor.id, type: "CALL_STARTED", payload: { callId: call.id } } });
    }
    await db.$transaction(async tx => {
      // Only a genuine rejoin starts a new signaling window. Repeated joins must
      // not move joinedAt past an offer the other caller has already sent.
      await tx.chatVoiceParticipant.updateMany({ where: { callId: call.id, userId: actor.id, leftAt: { not: null } }, data: { leftAt: null, joinedAt: new Date(), lastSeenAt: new Date() } });
      await tx.chatVoiceParticipant.upsert({ where: { callId_userId: { callId: call.id, userId: actor.id } }, create: { callId: call.id, userId: actor.id }, update: { lastSeenAt: new Date() } });
    });
    const participants = await db.chatVoiceParticipant.findMany({ where: { callId: call.id, leftAt: null }, select: { userId: true, joinedAt: true, user: { select: { employee: { select: { fullName: true } }, email: true } } } });
    return ok({ item: { id: call.id, participants: participants.map(person => ({ userId: person.userId, joinedAt: person.joinedAt, name: person.user.employee?.fullName ?? person.user.email })) }, configuration });
  } catch (error) { return fail(error); }
}
