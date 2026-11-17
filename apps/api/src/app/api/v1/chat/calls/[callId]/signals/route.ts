import { z } from "zod";
import { Prisma } from "@prisma/client";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ callId: string }> };
const querySchema = z.object({ afterAt: z.iso.datetime().optional(), afterId: z.string().uuid().optional() }).strict().refine(value => Boolean(value.afterAt) === Boolean(value.afterId), "Both signaling cursor fields are required together.");
const bodySchema = z.object({ toUserId: z.string().uuid(), type: z.enum(["OFFER", "ANSWER", "CANDIDATE"]), payload: z.record(z.string(), z.unknown()) }).strict().refine(value => JSON.stringify(value.payload).length <= 24_000, "Call signaling payload is too large.");

export async function GET(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use voice calls." } }, { status: 401 });
  try {
    const { callId } = await params;
    const cursor = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const participant = await db.chatVoiceParticipant.findFirst({ where: { callId, userId: actor.id, leftAt: null, call: { is: { status: "ACTIVE" } } }, select: { joinedAt: true, call: { select: { id: true, conversationId: true, status: true } } } });
    if (!participant) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Active call not found." } }, { status: 404 });
    await db.chatVoiceParticipant.updateMany({ where: { callId, userId: actor.id, leftAt: null, lastSeenAt: { lt: new Date(Date.now() - 10_000) } }, data: { lastSeenAt: new Date() } });
    const afterAt = cursor.afterAt ? new Date(cursor.afterAt) : participant.joinedAt;
    const [signals, participants] = await Promise.all([
      db.chatVoiceSignal.findMany({ where: { callId, toUserId: actor.id, createdAt: { gte: participant.joinedAt }, ...(cursor.afterId ? { OR: [{ createdAt: { gt: afterAt } }, { createdAt: afterAt, id: { gt: cursor.afterId } }] } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100 }),
      db.chatVoiceParticipant.findMany({ where: { callId, leftAt: null }, select: { userId: true, user: { select: { employee: { select: { fullName: true } }, email: true } } } }),
    ]);
    const items = signals.map(signal => ({ id: signal.id, fromUserId: signal.fromUserId, type: signal.type, payload: signal.payload, createdAt: signal.createdAt }));
    const last = items.at(-1);
    return ok({ callId, participants: participants.map(item => ({ userId: item.userId, name: item.user.employee?.fullName ?? item.user.email })), signals: items, nextCursor: last ? { afterAt: last.createdAt.toISOString(), afterId: last.id } : cursor.afterAt && cursor.afterId ? cursor : null });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use voice calls." } }, { status: 401 });
  try {
    const { callId } = await params;
    const input = bodySchema.parse(await request.json());
    const [sender, recipient] = await Promise.all([
      db.chatVoiceParticipant.findFirst({ where: { callId, userId: actor.id, leftAt: null, call: { is: { status: "ACTIVE" } } }, select: { call: { select: { conversationId: true } } } }),
      db.chatVoiceParticipant.findFirst({ where: { callId, userId: input.toUserId, leftAt: null, call: { is: { status: "ACTIVE" } } }, select: { userId: true } }),
    ]);
    if (!sender || !recipient || input.toUserId === actor.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Both call members must be active participants." } }, { status: 403 });
    const signal = await db.chatVoiceSignal.create({ data: { callId, fromUserId: actor.id, toUserId: input.toUserId, type: input.type, payload: input.payload as Prisma.InputJsonValue } });
    await db.chatEvent.create({ data: { conversationId: sender.call.conversationId, actorId: actor.id, type: "CALL_UPDATED", payload: { callId } } });
    return ok({ id: signal.id, createdAt: signal.createdAt }, 201);
  } catch (error) { return fail(error); }
}
