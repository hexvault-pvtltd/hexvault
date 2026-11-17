import { db } from "@core/lib/db";

export type TaskReviewDecision = "APPROVED" | "CHANGES_REQUESTED";
export class TaskReviewError extends Error {
  constructor(public code: "NOT_FOUND" | "CONFLICT", message: string) { super(message); }
}

export async function reviewTask(id: string, actorId: string, decision: TaskReviewDecision, feedback?: string) {
  return db.$transaction(async tx => {
    const task = await tx.task.findUnique({ where: { id }, include: { assignees: { where: { unassignedAt: null }, include: { employee: { select: { userId: true } } } } } });
    if (!task) throw new TaskReviewError("NOT_FOUND", "Task not found.");
    const nextStatus = decision === "APPROVED" ? "DONE" : "IN_PROGRESS";
    const changed = await tx.task.updateMany({ where: { id, status: "IN_REVIEW" }, data: { status: nextStatus } });
    if (!changed.count) throw new TaskReviewError("CONFLICT", "Only tasks submitted for review can be reviewed.");
    const review = await tx.taskReview.create({ data: { taskId: id, reviewerId: actorId, decision, feedback } });
    await tx.taskStatusHistory.create({ data: { taskId: id, fromStatus: "IN_REVIEW", toStatus: nextStatus, actorId, reason: feedback } });
    await tx.auditLog.create({ data: { actorId, action: `task.review_${decision.toLowerCase()}`, resourceType: "task", resourceId: id } });
    const recipients = task.assignees.flatMap(item => item.employee.userId ? [item.employee.userId] : []);
    if (recipients.length) await tx.notification.createMany({ data: recipients.map(recipientUserId => ({ recipientUserId, type: `TASK_REVIEW_${decision}`, payload: { taskId: id, taskTitle: task.title, decision, feedback: feedback ?? null } })) });
    return { review, task: await tx.task.findUniqueOrThrow({ where: { id } }) };
  });
}
