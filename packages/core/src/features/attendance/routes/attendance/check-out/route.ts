import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

export async function POST() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.employee) return NextResponse.json({ error: { code: "EMPLOYEE_REQUIRED", message: "Your account is not linked to an employee profile." } }, { status: 409 });
  try {
    const session = await db.$transaction(async tx => {
      const candidate = await tx.attendanceSession.findFirst({ where: { employeeId: actor.employee!.id, checkOutAt: null }, select: { id: true } });
      if (!candidate) throw new Error("NO_OPEN_SESSION");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${candidate.id} || ':attendance-lifecycle'))`;
      const open = await tx.attendanceSession.findFirst({ where: { id: candidate.id, checkOutAt: null }, include: { breaks: { where: { endedAt: null } } } });
      if (!open) throw new Error("NO_OPEN_SESSION");
      if (open.breaks.length) throw new Error("BREAK_OPEN");
      const now = new Date();
      const changed = await tx.attendanceSession.updateMany({ where: { id: open.id, checkOutAt: null }, data: { checkOutAt: now, status: "COMPLETE" } });
      if (!changed.count) throw new Error("NO_OPEN_SESSION");
      await tx.attendanceEvent.create({ data: { sessionId: open.id, eventType: "CHECK_OUT", actorUserId: actor.id } });
      return tx.attendanceSession.findUniqueOrThrow({ where: { id: open.id } });
    });
    return ok(session);
  } catch (error) {
    if (error instanceof Error && error.message === "NO_OPEN_SESSION") return NextResponse.json({ error: { code: "CONFLICT", message: "There is no open attendance session." } }, { status: 409 });
    if (error instanceof Error && error.message === "BREAK_OPEN") return NextResponse.json({ error: { code: "CONFLICT", message: "End your break before checking out." } }, { status: 409 });
    return fail(error);
  }
}
