import { db } from "@core/lib/db";

export type LeaveDecision = "APPROVED" | "REJECTED";
export function leaveDays(startDate: Date, endDate: Date, partialDay: boolean) {
  if (partialDay) return [{ year: startDate.getUTCFullYear(), days: 0.5 }];
  const counts = new Map<number, number>();
  for (let date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 1)) counts.set(date.getUTCFullYear(), (counts.get(date.getUTCFullYear()) ?? 0) + 1);
  return [...counts].map(([year, days]) => ({ year, days }));
}
export async function createLeaveRequest(employeeId: string, actorId: string, input: { leaveTypeId: string; startDate: Date; endDate: Date; partialDay: boolean; reason: string }) {
  const startDate = new Date(Date.UTC(input.startDate.getUTCFullYear(), input.startDate.getUTCMonth(), input.startDate.getUTCDate()));
  const endDate = new Date(Date.UTC(input.endDate.getUTCFullYear(), input.endDate.getUTCMonth(), input.endDate.getUTCDate()));
  if ((endDate.getTime() - startDate.getTime()) / 86_400_000 > 365) throw new Error("LEAVE_REQUEST_TOO_LONG");
  if (input.partialDay && startDate.getTime() !== endDate.getTime()) throw new Error("PARTIAL_DAY_ONE_DATE");
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId} || ':leave-request'))`;
    const leaveType = await tx.leaveType.findFirst({ where: { id: input.leaveTypeId, active: true } });
    if (!leaveType) throw new Error("LEAVE_TYPE_INACTIVE");
    const overlap = await tx.leaveRequest.findFirst({ where: { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: endDate }, endDate: { gte: startDate } } });
    if (overlap) throw new Error("LEAVE_REQUEST_OVERLAP");
    const item = await tx.leaveRequest.create({ data: { ...input, startDate, endDate, employeeId } });
    await tx.auditLog.create({ data: { actorId, action: "leave.requested", resourceType: "leave_request", resourceId: item.id } });
    return item;
  });
}

export async function decideLeaveRequest(id: string, actorId: string, decision: LeaveDecision) {
  return db.$transaction(async tx => {
    const request = await tx.leaveRequest.findUnique({ where: { id }, include: { leaveType: true, employee: { select: { userId: true } } } });
    if (!request) throw new Error("LEAVE_NOT_FOUND");
    if (request.status !== "PENDING") throw new Error("LEAVE_ALREADY_DECIDED");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${request.employeeId} || ':' || ${request.leaveTypeId} || ':leave-balance'))`;
    const changed = await tx.leaveRequest.updateMany({ where: { id, status: "PENDING" }, data: { status: decision, approverId: actorId, decidedAt: new Date() } });
    if (!changed.count) throw new Error("LEAVE_ALREADY_DECIDED");
    if (decision === "APPROVED") {
      for (const segment of leaveDays(request.startDate, request.endDate, request.partialDay)) {
        const existing = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: segment.year } } });
        const opening = existing?.opening ?? request.leaveType.annualAllowance ?? 0;
        const remaining = opening + (existing?.accrued ?? 0) + (existing?.adjusted ?? 0) - (existing?.used ?? 0);
        if (request.leaveType.annualAllowance !== null && segment.days > remaining) throw new Error("LEAVE_BALANCE_INSUFFICIENT");
        await tx.leaveBalance.upsert({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: segment.year } }, create: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: segment.year, opening, used: segment.days }, update: { used: { increment: segment.days } } });
      }
    }
    if (request.employee.userId) await tx.notification.create({ data: { recipientUserId: request.employee.userId, type: `LEAVE_${decision}`, payload: { requestId: id, decision } } });
    await tx.auditLog.create({ data: { actorId, action: `leave.${decision.toLowerCase()}`, resourceType: "leave_request", resourceId: id } });
    return tx.leaveRequest.findUniqueOrThrow({ where: { id } });
  });
}

export async function cancelLeaveRequest(id: string, actorId: string, today: Date) {
  return db.$transaction(async tx => {
    const request = await tx.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new Error("LEAVE_NOT_FOUND");
    if (!["PENDING", "APPROVED"].includes(request.status)) throw new Error("LEAVE_CANNOT_CANCEL");
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (request.status === "APPROVED" && request.startDate < day) throw new Error("LEAVE_ALREADY_STARTED");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${request.employeeId} || ':' || ${request.leaveTypeId} || ':leave-balance'))`;
    const changed = await tx.leaveRequest.updateMany({ where: { id, status: request.status }, data: { status: "CANCELLED", approverId: actorId, decidedAt: new Date() } });
    if (!changed.count) throw new Error("LEAVE_CANNOT_CANCEL");
    if (request.status === "APPROVED") for (const segment of leaveDays(request.startDate, request.endDate, request.partialDay)) {
      const balance = await tx.leaveBalance.updateMany({ where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year: segment.year, used: { gte: segment.days } }, data: { used: { decrement: segment.days } } });
      if (!balance.count) throw new Error("LEAVE_BALANCE_INCONSISTENT");
    }
    await tx.auditLog.create({ data: { actorId, action: "leave.cancelled", resourceType: "leave_request", resourceId: id } });
    return tx.leaveRequest.findUniqueOrThrow({ where: { id } });
  });
}
