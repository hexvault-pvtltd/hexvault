import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { companyWorkDate, localShiftStart } from "@core/lib/time";
import { NextResponse } from "next/server";

export async function POST() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.employee) return NextResponse.json({ error: { code: "EMPLOYEE_REQUIRED", message: "Your account is not linked to an employee profile." } }, { status: 409 });
  const now = new Date();
  const workDate = companyWorkDate(now);
  try {
    const session = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${actor.employee!.id} || ':attendance-correction'))`;
      const existing = await tx.attendanceSession.findFirst({ where: { employeeId: actor.employee!.id, checkOutAt: null } });
      if (existing) throw new Error("ALREADY_CHECKED_IN");
      const assignment = await tx.shiftAssignment.findFirst({
        where: { employeeId: actor.employee!.id, validFrom: { lte: workDate }, OR: [{ validTo: null }, { validTo: { gte: workDate } }], shift: { active: true } },
        include: { shift: true }, orderBy: { validFrom: "desc" },
      });
      const item = await tx.attendanceSession.create({ data: { employeeId: actor.employee!.id, workDate, checkInAt: now, status: "OPEN", ...(assignment ? { shiftAssignmentId: assignment.id } : {}) } });
      const scheduled = assignment ? localShiftStart(workDate, assignment.shift.startLocalTime, assignment.shift.timezone) : null;
      const lateMinutes = scheduled ? Math.max(0, Math.ceil((now.getTime() - scheduled.getTime() - assignment!.shift.graceMinutes * 60_000) / 60_000)) : null;
      await tx.attendanceEvent.create({ data: { sessionId: item.id, eventType: "CHECK_IN", actorUserId: actor.id, metadata: assignment ? { shiftAssignmentId: assignment.id, scheduledStartAt: scheduled?.toISOString() ?? null, lateMinutes } : undefined } });
      return item;
    });
    return ok(session, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_CHECKED_IN") return NextResponse.json({ error: { code: "CONFLICT", message: "You already have an open attendance session." } }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: { code: "CONFLICT", message: "You already have an open attendance session." } }, { status: 409 });
    return fail(error);
  }
}
