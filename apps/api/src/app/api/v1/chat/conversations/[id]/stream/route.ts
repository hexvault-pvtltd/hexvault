import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const cursorSchema = z.object({ afterAt: z.iso.datetime().optional(), afterId: z.string().uuid().optional() }).strict().refine(value => Boolean(value.afterAt) === Boolean(value.afterId), "Both stream cursor fields are required together.");
const encoder = new TextEncoder();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use chat." } }, { status: 401 });
  const { id: conversationId } = await params;
  try {
    const query = cursorSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const membership = await db.chatMembership.findFirst({ where: { conversationId, userId: actor.id, leftAt: null }, select: { id: true } });
    if (!membership) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Chat conversation not found." } }, { status: 404 });
    let cursorAt = query.afterAt ? new Date(query.afterAt) : new Date(0);
    let cursorId = query.afterId ?? "00000000-0000-0000-0000-000000000000";
    let eventAt = query.afterAt ? new Date(query.afterAt) : new Date();
    let eventId = "00000000-0000-0000-0000-000000000000";
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let lastHeartbeat = Date.now();
        let lastSessionCheck = Date.now();
        const close = () => {
          if (closed) return;
          closed = true;
          if (timer) clearTimeout(timer);
          request.signal.removeEventListener("abort", close);
          try { controller.close(); } catch { /* The browser may have already disconnected. */ }
        };
        request.signal.addEventListener("abort", close, { once: true });
        const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        void (async () => {
          try {
            controller.enqueue(encoder.encode(": connected\n\n"));
            while (!closed && !request.signal.aborted) {
              if (Date.now() - lastSessionCheck > 15_000) {
                lastSessionCheck = Date.now();
                const [session, activeMembership] = await Promise.all([
                  db.session.findUnique({ where: { id: actor.sessionId }, select: { revokedAt: true, expiresAt: true, user: { select: { status: true, employee: { select: { lifecycleStatus: true } } } } } }),
                  db.chatMembership.findFirst({ where: { conversationId, userId: actor.id, leftAt: null }, select: { id: true } }),
                ]);
                if (!activeMembership || !session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE" || (session.user.employee && ["SUSPENDED", "EXITED"].includes(session.user.employee.lifecycleStatus))) {
                  send("auth-expired", { message: "Your session ended. Sign in again to continue chatting." });
                  close();
                  break;
                }
              }
              const messages = await db.chatMessage.findMany({
                where: { conversationId, OR: [{ createdAt: { gt: cursorAt } }, { createdAt: cursorAt, id: { gt: cursorId } }] },
                include: { sender: { select: { id: true, email: true, employee: { select: { fullName: true } } } } },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                take: 100,
              });
              for (const message of messages) {
                if (closed) break;
                send("message", { id: message.id, clientMessageId: message.clientMessageId, senderId: message.senderId, senderName: message.sender.employee?.fullName ?? message.sender.email, body: message.body, createdAt: message.createdAt, mine: message.senderId === actor.id });
                cursorAt = message.createdAt;
                cursorId = message.id;
              }
              const events = await db.chatEvent.findMany({
                where: { conversationId, OR: [{ createdAt: { gt: eventAt } }, { createdAt: eventAt, id: { gt: eventId } }] },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100,
              });
              for (const event of events) {
                if (closed) break;
                send("chat-event", { id: event.id, type: event.type, payload: event.payload, createdAt: event.createdAt, actorId: event.actorId });
                eventAt = event.createdAt;
                eventId = event.id;
              }
              if (closed) break;
              if (Date.now() - lastHeartbeat > 20_000) { controller.enqueue(encoder.encode(": keepalive\n\n")); lastHeartbeat = Date.now(); }
              await new Promise<void>(resolve => { timer = setTimeout(resolve, 1200); });
            }
          } catch (error) {
            if (!closed) {
              console.error("chat_stream_failed", error instanceof Error ? error.name : "unknown");
              try { send("chat-error", { message: "Live connection interrupted. Reconnecting…" }); } catch { /* The client may have disconnected. */ }
              close();
            }
          }
        })();
      },
      cancel() { /* Request abort closes the loop and releases its timer. */ },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "The live chat cursor is invalid." } }, { status: 422 });
    console.error("chat_stream_init_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The live chat stream could not be opened." } }, { status: 500 });
  }
}
