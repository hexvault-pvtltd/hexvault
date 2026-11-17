import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canManageTask, canReadTask } from "@core/features/tasks/permissions";
import { removeTaskDependency, TaskDependencyError } from "@core/features/tasks/dependencies";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; dependsOnTaskId: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id, dependsOnTaskId } = await params;
  const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
  if (!await canManageTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot manage dependencies for this task." } }, { status: 403 });
  const dependencyTask = await db.task.findUnique({ where: { id: dependsOnTaskId }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
  if (!dependencyTask) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Dependency task not found." } }, { status: 404 });
  if (!await canReadTask(actor, dependencyTask)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Dependency task is outside your scope." } }, { status: 403 });
  try { await removeTaskDependency(id, dependsOnTaskId, actor.id); return ok({ taskId: id, dependsOnTaskId, removed: true }); }
  catch (error) {
    if (error instanceof TaskDependencyError) return NextResponse.json({ error: { code: error.code, message: "Task dependency not found." } }, { status: 404 });
    return fail(error);
  }
}
