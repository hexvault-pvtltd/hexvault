import { db } from "@core/lib/db";

export type ReviewInput = { employeeId: string; periodStart: Date; periodEnd: Date; summary: string };
export type GoalInput = { employeeId: string; title: string; description?: string | null; targetDate?: Date | null };

export class PerformanceError extends Error {
  constructor(public code: "NOT_FOUND" | "CONFLICT", message: string) { super(message); }
}

export async function createReview(actorId: string, input: ReviewInput) {
  return db.$transaction(async tx => {
    const periodKey = `${input.employeeId}:${input.periodStart.toISOString()}:${input.periodEnd.toISOString()}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${periodKey}))`;
    const employee = await tx.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, lifecycleStatus: true } });
    if (!employee || employee.lifecycleStatus !== "ACTIVE") throw new PerformanceError("NOT_FOUND", "Active employee not found.");
    const exists = await tx.performanceReview.findFirst({ where: { employeeId: input.employeeId, periodStart: input.periodStart, periodEnd: input.periodEnd } });
    if (exists) throw new PerformanceError("CONFLICT", "A review already exists for this employee and period.");
    const review = await tx.performanceReview.create({ data: { ...input, reviewerId: actorId, publicationStatus: "DRAFT" } });
    await tx.auditLog.create({ data: { actorId, action: "performance.review_created", resourceType: "performance_review", resourceId: review.id } });
    return review;
  });
}

export async function updateDraftReview(id: string, actorId: string, data: Pick<ReviewInput, "periodStart" | "periodEnd" | "summary">) {
  return db.$transaction(async tx => {
    const current = await tx.performanceReview.findUnique({ where: { id } });
    if (!current) throw new PerformanceError("NOT_FOUND", "Review not found.");
    if (current.publicationStatus !== "DRAFT") throw new PerformanceError("CONFLICT", "Published reviews cannot be edited.");
    const changed = await tx.performanceReview.updateMany({ where: { id, publicationStatus: "DRAFT" }, data });
    if (!changed.count) throw new PerformanceError("CONFLICT", "The review changed while you were editing it.");
    await tx.auditLog.create({ data: { actorId, action: "performance.review_updated", resourceType: "performance_review", resourceId: id } });
    return tx.performanceReview.findUniqueOrThrow({ where: { id } });
  });
}

export async function publishReview(id: string, actorId: string) {
  return db.$transaction(async tx => {
    const changed = await tx.performanceReview.updateMany({ where: { id, publicationStatus: "DRAFT" }, data: { publicationStatus: "PUBLISHED" } });
    if (!changed.count) {
      const existing = await tx.performanceReview.findUnique({ where: { id }, select: { id: true, publicationStatus: true } });
      if (!existing) throw new PerformanceError("NOT_FOUND", "Review not found.");
      throw new PerformanceError("CONFLICT", "This review has already been published.");
    }
    const review = await tx.performanceReview.findUniqueOrThrow({ where: { id } });
    const employee = await tx.employee.findUnique({ where: { id: review.employeeId }, select: { userId: true } });
    if (employee?.userId) await tx.notification.create({ data: { recipientUserId: employee.userId, type: "PERFORMANCE_REVIEW_PUBLISHED", payload: { reviewId: id, periodStart: review.periodStart.toISOString(), periodEnd: review.periodEnd.toISOString() } } });
    await tx.auditLog.create({ data: { actorId, action: "performance.review_published", resourceType: "performance_review", resourceId: id } });
    return review;
  });
}

export async function createGoal(actorId: string, input: GoalInput) {
  return db.$transaction(async tx => {
    const employee = await tx.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, lifecycleStatus: true } });
    if (!employee || employee.lifecycleStatus !== "ACTIVE") throw new PerformanceError("NOT_FOUND", "Active employee not found.");
    const goal = await tx.employeeGoal.create({ data: { ...input, description: input.description ?? null, targetDate: input.targetDate ?? null, status: "ACTIVE" } });
    await tx.auditLog.create({ data: { actorId, action: "performance.goal_created", resourceType: "employee_goal", resourceId: goal.id } });
    return goal;
  });
}

export async function updateGoal(id: string, actorId: string, data: { status?: string; progressNote?: string | null }) {
  return db.$transaction(async tx => {
    const goal = await tx.employeeGoal.findUnique({ where: { id } });
    if (!goal) throw new PerformanceError("NOT_FOUND", "Goal not found.");
    const changed = await tx.employeeGoal.updateMany({ where: { id, status: goal.status }, data });
    if (!changed.count) throw new PerformanceError("CONFLICT", "The goal changed while you were editing it.");
    await tx.auditLog.create({ data: { actorId, action: "performance.goal_updated", resourceType: "employee_goal", resourceId: id } });
    return tx.employeeGoal.findUniqueOrThrow({ where: { id } });
  });
}
