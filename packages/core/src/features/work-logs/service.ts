import { db } from "@core/lib/db";

export type WorkLogDecision = "APPROVED" | "CHANGES_REQUESTED";
export class WorkLogReviewError extends Error {
  constructor(public code: "NOT_FOUND" | "CONFLICT", message: string) { super(message); }
}

export async function reviewWorkLog(id: string, actorId: string, decision: WorkLogDecision, feedback?: string) {
  return db.$transaction(async tx => {
    const log = await tx.dailyWorkLog.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } });
    if (!log) throw new WorkLogReviewError("NOT_FOUND", "Work log not found.");
    const changed = await tx.dailyWorkLog.updateMany({ where: { id, reviewStatus: "SUBMITTED" }, data: { reviewStatus: decision } });
    if (!changed.count) throw new WorkLogReviewError("CONFLICT", "Only submitted journals can be reviewed.");
    if (log.employee.userId) await tx.notification.create({ data: { recipientUserId: log.employee.userId, type: `WORK_LOG_${decision}`, payload: { workLogId: id, decision, feedback: feedback ?? null } } });
    await tx.auditLog.create({ data: { actorId, action: `work_log.${decision.toLowerCase()}`, resourceType: "work_log", resourceId: id, metadata: { feedback: feedback ?? null } } });
    return tx.dailyWorkLog.findUniqueOrThrow({ where: { id }, select: { id: true, reviewStatus: true, employeeId: true } });
  });
}
