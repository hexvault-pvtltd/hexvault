import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { canManageTask } from "@core/features/tasks/permissions";
import { reviewTask, TaskReviewError } from "@core/features/tasks/reviews";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]), feedback: z.string().trim().max(2000).optional() }).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose an approval decision and valid feedback." } }, { status: 422 });
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, include: { employee: { select: { id: true } } } } } });
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
  if (!await canManageTask(actor, task) || task.assignees.some(item => item.employee.id === actor.employee?.id)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot review this task." } }, { status: 403 });
  try {
    return ok(await reviewTask(id, actor.id, parsed.data.decision, parsed.data.feedback));
  } catch (error) {
    if (error instanceof TaskReviewError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    console.error("task_review_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The task review could not be saved." } }, { status: 500 });
  }
}
