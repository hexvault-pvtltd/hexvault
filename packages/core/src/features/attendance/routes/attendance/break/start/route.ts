import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

export async function POST() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.employee) return NextResponse.json({ error: { code: "EMPLOYEE_REQUIRED", message: "Your account has no employee profile." } }, { status: 409 });
  try {
    const item = await db.$transaction(async tx => {
      const candidate = await tx.attendanceSession.findFirst({ where: { employeeId: actor.employee!.id, checkOutAt: null }, select: { id: true } });
      if (!candidate) throw new Error("NO_OPEN_SESSION");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.id} || ':attendance-lifecycle'))`;
      const session = await tx.attendanceSession.findFirst({ where: { id: candidate.id, checkOutAt: null }, select: { id: true } });
      if (!session) throw new Error("NO_OPEN_SESSION");
      const openBreak = await tx.attendanceBreak.findFirst({ where: { sessionId: session.id, endedAt: null }, select: { id: true } });
      if (openBreak) throw new Error("BREAK_ALREADY_OPEN");
      const br = await tx.attendanceBreak.create({ data: { sessionId: session.id, startedAt: new Date() } });
      await tx.attendanceEvent.create({ data: { sessionId: session.id, eventType: "BREAK_START", actorUserId: actor.id } });
      return br;
    });
    return ok(item, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "NO_OPEN_SESSION") return NextResponse.json({ error: { code: "CONFLICT", message: "Check in before starting a break." } }, { status: 409 });
    if (error instanceof Error && error.message === "BREAK_ALREADY_OPEN") return NextResponse.json({ error: { code: "CONFLICT", message: "A break is already in progress." } }, { status: 409 });
    return fail(error);
  }
}
