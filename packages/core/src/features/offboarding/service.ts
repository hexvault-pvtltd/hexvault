import { db } from "@core/lib/db";

export class OffboardingError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function finalizeOffboarding(caseId: string, actorId: string) {
  return db.$transaction(async tx => {
    const item = await tx.offboardingCase.findUnique({ where: { id: caseId }, include: { items: true } });
    if (!item) throw new OffboardingError(404, "NOT_FOUND", "Offboarding case not found.");
    if (item.status === "COMPLETE") return { id: item.id, status: item.status, idempotent: true };
    if (!["OPEN", "IN_PROGRESS"].includes(item.status)) throw new OffboardingError(409, "INVALID_STATE", "This offboarding case cannot be finalized.");
    if (item.items.some(checklistItem => checklistItem.status !== "COMPLETE")) throw new OffboardingError(409, "CHECKLIST_INCOMPLETE", "Complete all handover checklist items before finalizing.");

    const period = await tx.employmentPeriod.updateMany({ where: { employeeId: item.employeeId, status: "ACTIVE" }, data: { status: "EXITED", endDate: item.effectiveDate, exitReason: item.reason } });
    if (!period.count) throw new OffboardingError(409, "NO_ACTIVE_EMPLOYMENT", "There is no active employment period to close.");
    const employee = await tx.employee.findUniqueOrThrow({ where: { id: item.employeeId }, select: { userId: true, lifecycleStatus: true } });
    await tx.employee.update({ where: { id: item.employeeId }, data: { lifecycleStatus: "EXITED" } });
    if (employee.userId) {
      await tx.user.update({ where: { id: employee.userId }, data: { status: "DEACTIVATED" } });
      await tx.session.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await tx.employeeHistory.create({ data: { employeeId: item.employeeId, eventType: "OFFBOARDED", oldData: { lifecycleStatus: employee.lifecycleStatus }, newData: { lifecycleStatus: "EXITED", effectiveDate: item.effectiveDate.toISOString() }, actorId } });
    await tx.auditLog.create({ data: { actorId, action: "employee.offboarded", resourceType: "employee", resourceId: item.employeeId, metadata: { caseId } } });
    await tx.jobOutbox.create({ data: { eventType: "OFFBOARDING_FINALIZED", payload: { caseId, employeeId: item.employeeId, recipientUserId: employee.userId } } });
    return tx.offboardingCase.update({ where: { id: caseId }, data: { status: "COMPLETE", approvedBy: actorId, completedAt: new Date() }, select: { id: true, status: true, completedAt: true } });
  });
}
