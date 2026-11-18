import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canManageTask, canReadTask } from "@core/features/tasks/permissions";
import { addTaskDependency, TaskDependencyError } from "@core/features/tasks/dependencies";
import { NextResponse } from "next/server";

const schema = z.object({ dependsOnTaskId: z.string().uuid() }).strict();
const scopeInclude = { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id }, include: scopeInclude });
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
  if (!await canReadTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Task is outside your scope." } }, { status: 403 });
  const [dependencies, dependents] = await Promise.all([
    db.taskDependency.findMany({ where: { taskId: id }, include: { dependsOn: { include: scopeInclude } } }),
    db.taskDependency.findMany({ where: { dependsOnTaskId: id }, include: { task: { include: scopeInclude } } }),
  ]);
  const items = [
    ...(await Promise.all(dependencies.map(async item => await canReadTask(actor, item.dependsOn) ? { id: item.id, direction: "BLOCKED_BY" as const, task: item.dependsOn } : null))).filter(item => item !== null),
    ...(await Promise.all(dependents.map(async item => await canReadTask(actor, item.task) ? { id: item.id, direction: "BLOCKS" as const, task: item.task } : null))).filter(item => item !== null),
  ];
  return ok({ items, total: items.length });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = schema.parse(await request.json());
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id }, include: scopeInclude });
    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
    if (!await canManageTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot manage dependencies for this task." } }, { status: 403 });
    const dependency = await db.task.findUnique({ where: { id: input.dependsOnTaskId }, include: scopeInclude });
    if (!dependency) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Dependency task not found." } }, { status: 404 });
    if (!await canReadTask(actor, dependency)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Dependency task is outside your scope." } }, { status: 403 });
    const created = await addTaskDependency(id, input.dependsOnTaskId, actor.id);
    return ok(created, 201);
  } catch (error) {
    if (error instanceof TaskDependencyError) {
      const status = error.code === "DEPENDENCY_CYCLE" || error.code === "PROJECT_MISMATCH" || error.code === "DEPENDENCY_EXISTS" ? 409 : 404;
      return NextResponse.json({ error: { code: error.code, message: error.code === "DEPENDENCY_CYCLE" ? "This dependency would create a cycle." : error.code === "PROJECT_MISMATCH" ? "Dependencies must belong to the same project." : "Task not found." } }, { status });
    }
    return fail(error);
  }
}
