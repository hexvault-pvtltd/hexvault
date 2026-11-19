import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canManageTask, canReadTask } from "@core/features/tasks/permissions";
import { NextResponse } from "next/server";

const schema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().max(4000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(100000).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Provide at least one task field.");

const include = {
  project: { include: { department: { select: { id: true, name: true, headEmployeeId: true } } } },
  assignees: { where: { unassignedAt: null }, include: { employee: { select: { id: true, fullName: true, employeeCode: true } } } },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id }, include: { ...include, history: { orderBy: { changedAt: "desc" }, take: 50 }, comments: { orderBy: { createdAt: "asc" }, take: 100 }, reviews: { orderBy: { createdAt: "desc" }, take: 20 }, dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } }, dependedOnBy: { include: { task: { select: { id: true, title: true, status: true } } } } } });
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
  if (!await canReadTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Task is outside your scope." } }, { status: 403 });
  return ok(task);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = schema.parse(await request.json());
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id }, include });
    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
    if (!await canManageTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot edit this task." } }, { status: 403 });
    const updated = await db.$transaction(async tx => {
      const result = await tx.task.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.updated", resourceType: "task", resourceId: id, metadata: { fields: Object.keys(input) } } });
      return result;
    });
    return ok(updated);
  } catch (error) { return fail(error); }
}
