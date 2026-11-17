import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canManageProject, canReadProject } from "@core/features/projects/permissions";
import { canReadTask } from "@core/features/tasks/permissions";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextResponse } from "next/server";

const updateSchema = z.object({ name: z.string().trim().min(2).max(160).optional(), description: z.string().max(4000).nullable().optional(), status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(), startDate: z.coerce.date().nullable().optional(), dueDate: z.coerce.date().nullable().optional() }).strict().refine(value => Object.keys(value).length > 0);
const scopeInclude = { department: { select: { id: true, name: true, headEmployeeId: true } }, memberships: { where: { leftAt: null }, select: { employeeId: true, projectRole: true } } } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { ...scopeInclude, _count: { select: { tasks: true, memberships: true } }, tasks: { orderBy: { updatedAt: "desc" }, take: 100, include: { assignees: { where: { unassignedAt: null }, include: { employee: { select: { id: true, fullName: true } } } } } } } });
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  if (!await canReadProject(actor, project)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Project is outside your scope." } }, { status: 403 });
  if (actor.roles.includes("TEAM_LEAD")) {
    const visibleTaskIds = await Promise.all(project.tasks.map(async task => await canReadTask(actor, { ...task, project }) ? task.id : null));
    const allowed = new Set(visibleTaskIds.filter((taskId): taskId is string => taskId !== null));
    const visible = await visibleEmployeeIds(actor);
    project.tasks = project.tasks.filter(task => allowed.has(task.id));
    project.tasks = project.tasks.map(task => ({ ...task, assignees: task.assignees.filter(item => visible?.includes(item.employeeId)) }));
    project.memberships = project.memberships.filter(member => visible?.includes(member.employeeId));
    project._count.tasks = project.tasks.length;
    project._count.memberships = project.memberships.length;
  }
  return ok(project);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = updateSchema.parse(await request.json());
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id }, include: scopeInclude });
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
    if (!await canManageProject(actor, project)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot manage this project." } }, { status: 403 });
    const startDate = input.startDate === undefined ? project.startDate : input.startDate;
    const dueDate = input.dueDate === undefined ? project.dueDate : input.dueDate;
    if (startDate && dueDate && startDate > dueDate) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Due date must be on or after the start date." } }, { status: 422 });
    const result = await db.$transaction(async tx => {
      const updated = await tx.project.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "project.updated", resourceType: "project", resourceId: id, metadata: { fields: Object.keys(input) } } });
      return updated;
    });
    return ok(result);
  } catch (error) { return fail(error); }
}
