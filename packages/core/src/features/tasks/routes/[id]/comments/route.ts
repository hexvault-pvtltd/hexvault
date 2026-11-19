import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canReadTask } from "@core/features/tasks/permissions";
import { NextResponse } from "next/server";

const schema = z.object({ body: z.string().trim().min(1).max(5000) }).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
  if (!await canReadTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Task is outside your scope." } }, { status: 403 });
  const comments = await db.taskComment.findMany({ where: { taskId: id }, include: { author: { select: { id: true, employee: { select: { fullName: true, employeeCode: true } } } } }, orderBy: { createdAt: "asc" }, take: 100 });
  return ok({ items: comments, total: comments.length });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = schema.parse(await request.json());
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
    if (!await canReadTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Task is outside your scope." } }, { status: 403 });
    const comment = await db.$transaction(async tx => {
      const saved = await tx.taskComment.create({ data: { taskId: id, authorId: actor.id, body: input.body } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.comment_created", resourceType: "task", resourceId: id } });
      return saved;
    });
    return ok(comment, 201);
  } catch (error) { return fail(error); }
}
