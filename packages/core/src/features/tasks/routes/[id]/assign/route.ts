import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canAssignTaskTo, canManageTask } from "@core/features/tasks/permissions";
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
    if (!await canManageTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot assign this task." } }, { status: 403 });
    if (!await canAssignTaskTo(actor, input.employeeId, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "The employee is outside your assignment scope." } }, { status: 403 });
    const employee = await db.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, lifecycleStatus: true } });
    if (!employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    if (employee.lifecycleStatus !== "ACTIVE") return NextResponse.json({ error: { code: "CONFLICT", message: "Tasks can only be assigned to active employees." } }, { status: 409 });
    if (task.assignees.some(item => item.employeeId === input.employeeId)) return NextResponse.json({ error: { code: "CONFLICT", message: "This employee is already assigned." } }, { status: 409 });
    const assignment = await db.$transaction(async tx => {
      const result = await tx.taskAssignee.create({ data: { taskId: id, employeeId: input.employeeId, assignedBy: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.assignee_added", resourceType: "task", resourceId: id, metadata: { employeeId: input.employeeId } } });
      return result;
    });
    return ok(assignment, 201);
  } catch (error) { return fail(error); }
}
