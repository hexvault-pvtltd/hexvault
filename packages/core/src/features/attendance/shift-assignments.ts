import { db } from "@core/lib/db";

export function shiftRangesOverlap(first: { validFrom: Date; validTo?: Date | null }, second: { validFrom: Date; validTo?: Date | null }) {
  return first.validFrom.getTime() <= (second.validTo?.getTime() ?? Infinity) && second.validFrom.getTime() <= (first.validTo?.getTime() ?? Infinity);
}
export async function createShiftAssignment(actorId: string, input: { employeeId: string; shiftId: string; validFrom: Date; validTo?: Date }, database = db) {
  return database.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.employeeId} || ':shift-assignment'))`;
    const assignments = await tx.shiftAssignment.findMany({ where: { employeeId: input.employeeId }, select: { validFrom: true, validTo: true } });
    if (assignments.some(item => shiftRangesOverlap(item, input))) throw new Error("SHIFT_ASSIGNMENT_OVERLAP");
    const created = await tx.shiftAssignment.create({ data: input });
    await tx.auditLog.create({ data: { actorId, action: "shift.assigned", resourceType: "shift_assignment", resourceId: created.id, metadata: { employeeId: input.employeeId, shiftId: input.shiftId } } });
    return created;
  });
}

export async function setShiftAssignmentEndDate(actorId: string, id: string, validTo: Date) {
  return db.$transaction(async tx => {
    const current = await tx.shiftAssignment.findUnique({ where: { id } });
    if (!current) throw new Error("SHIFT_ASSIGNMENT_NOT_FOUND");
    if (validTo < current.validFrom) throw new Error("SHIFT_ASSIGNMENT_INVALID_END");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${current.employeeId} || ':shift-assignment'))`;
    const overlap = await tx.shiftAssignment.findFirst({ where: { id: { not: id }, employeeId: current.employeeId, validFrom: { lte: validTo }, OR: [{ validTo: null }, { validTo: { gte: current.validFrom } }] } });
    if (overlap) throw new Error("SHIFT_ASSIGNMENT_OVERLAP");
    const updated = await tx.shiftAssignment.update({ where: { id }, data: { validTo } });
    await tx.auditLog.create({ data: { actorId, action: "shift.assignment_updated", resourceType: "shift_assignment", resourceId: id } });
    return updated;
  });
}
