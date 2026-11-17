import { db } from "@core/lib/db";

export type CorrectionInput = { workDate: Date; checkInAt?: Date; checkOutAt?: Date; reason: string };
export type CorrectionDecision = "APPROVED" | "REJECTED";
type Requested = { workDate: string; checkInAt?: string; checkOutAt?: string; previousCheckInAt?: string; previousCheckOutAt?: string | null };

export async function submitAttendanceCorrection(employeeId: string, actorId: string, input: CorrectionInput) {
  const workDate = new Date(Date.UTC(input.workDate.getUTCFullYear(), input.workDate.getUTCMonth(), input.workDate.getUTCDate()));
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId} || ':attendance-correction'))`;
    const session = await tx.attendanceSession.findFirst({ where: { employeeId, workDate }, select: { id: true, checkInAt: true, checkOutAt: true } });
    const pending = await tx.attendanceCorrection.findMany({ where: { employeeId, status: "PENDING" }, select: { sessionId: true, requestedData: true } });
    if (pending.some(item => item.sessionId === (session?.id ?? null) || (item.requestedData as { workDate?: string }).workDate === workDate.toISOString())) throw new Error("CORRECTION_PENDING");
    const proposedIn = input.checkInAt ?? session?.checkInAt;
    const proposedOut = input.checkOutAt ?? session?.checkOutAt;
    if (proposedIn && proposedOut && proposedOut <= proposedIn) throw new Error("INVALID_CORRECTION_RANGE");
    const requestedData: Requested = {
      workDate: workDate.toISOString(),
      ...(input.checkInAt ? { checkInAt: input.checkInAt.toISOString() } : {}),
      ...(input.checkOutAt ? { checkOutAt: input.checkOutAt.toISOString() } : {}),
      ...(session ? { previousCheckInAt: session.checkInAt.toISOString(), previousCheckOutAt: session.checkOutAt?.toISOString() ?? null } : {}),
    };
    const correction = await tx.attendanceCorrection.create({ data: { employeeId, sessionId: session?.id ?? null, requestedData, reason: input.reason } });
    await tx.auditLog.create({ data: { actorId, action: "attendance.correction_requested", resourceType: "attendance_correction", resourceId: correction.id } });
    return correction;
  });
}

export async function decideAttendanceCorrection(id: string, actorId: string, decision: CorrectionDecision) {
  return db.$transaction(async tx => {
    const correction = await tx.attendanceCorrection.findUnique({ where: { id }, include: { session: true } });
    if (!correction) throw new Error("CORRECTION_NOT_FOUND");
    if (correction.status !== "PENDING") throw new Error("ALREADY_DECIDED");
    const data = correction.requestedData as Requested;
    const changed = await tx.attendanceCorrection.updateMany({ where: { id, status: "PENDING" }, data: { status: decision, decidedBy: actorId, decidedAt: new Date() } });
    if (!changed.count) throw new Error("ALREADY_DECIDED");
    let session = correction.session;
    if (decision === "APPROVED") {
      if (session) {
        if (data.previousCheckInAt !== session.checkInAt.toISOString() || (data.previousCheckOutAt ?? null) !== (session.checkOutAt?.toISOString() ?? null)) throw new Error("SESSION_CHANGED");
        const checkInAt = data.checkInAt ? new Date(data.checkInAt) : session.checkInAt;
        const checkOutAt = data.checkOutAt ? new Date(data.checkOutAt) : session.checkOutAt;
        if (checkOutAt && checkOutAt <= checkInAt) throw new Error("INVALID_CORRECTION_RANGE");
        session = await tx.attendanceSession.update({ where: { id: session.id }, data: {
          ...(data.checkInAt ? { checkInAt } : {}),
          ...(data.checkOutAt ? { checkOutAt, status: "CORRECTED" } : {}),
          ...(data.checkInAt && session.checkOutAt ? { status: "CORRECTED" } : {}),
        } });
      } else {
        if (!data.workDate || !data.checkInAt) throw new Error("CHECK_IN_REQUIRED");
        session = await tx.attendanceSession.create({ data: { employeeId: correction.employeeId, workDate: new Date(data.workDate), checkInAt: new Date(data.checkInAt), ...(data.checkOutAt ? { checkOutAt: new Date(data.checkOutAt), status: "CORRECTED" } : {}) } });
      }
      await tx.attendanceEvent.create({ data: { sessionId: session.id, eventType: "CORRECTION_APPROVED", actorUserId: actorId, metadata: { correctionId: id, previousCheckInAt: data.previousCheckInAt ?? null, previousCheckOutAt: data.previousCheckOutAt ?? null, checkInAt: data.checkInAt ?? null, checkOutAt: data.checkOutAt ?? null } } });
    }
    await tx.auditLog.create({ data: { actorId, action: `attendance.correction_${decision.toLowerCase()}`, resourceType: "attendance_correction", resourceId: id } });
    return { correction: await tx.attendanceCorrection.findUniqueOrThrow({ where: { id } }), session };
  });
}
