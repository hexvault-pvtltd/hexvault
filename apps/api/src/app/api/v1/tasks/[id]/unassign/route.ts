import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canManageTask } from "@core/features/tasks/permissions";
import { NextResponse } from "next/server";

const schema = z.object({ employeeId: z.string().uuid() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = schema.parse(await request.json());
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
    if (!await canManageTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot change assignments for this task." } }, { status: 403 });
    const result = await db.$transaction(async tx => {
      const changed = await tx.taskAssignee.updateMany({ where: { taskId: id, employeeId: input.employeeId, unassignedAt: null }, data: { unassignedAt: new Date() } });
      if (!changed.count) return null;
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.assignee_removed", resourceType: "task", resourceId: id, metadata: { employeeId: input.employeeId } } });
      return { taskId: id, employeeId: input.employeeId, unassigned: true };
    });
    return result ? ok(result) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Active task assignment not found." } }, { status: 404 });
  } catch (error) { return fail(error); }
}
