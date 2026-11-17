import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { canReadTask } from "@core/features/tasks/permissions";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
  if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
  if (!await canReadTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Task is outside your scope." } }, { status: 403 });
  const items = await db.taskStatusHistory.findMany({ where: { taskId: id }, orderBy: { changedAt: "desc" }, take: 100 });
  return ok({ items, total: items.length });
}
