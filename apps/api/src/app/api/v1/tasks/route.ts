import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ title: z.string().trim().min(2).max(180), description: z.string().max(4000).optional(), projectId: z.string().uuid().optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"), dueAt: z.coerce.date().optional(), assigneeIds: z.array(z.string().uuid()).max(20).default([]) }).refine(input => new Set(input.assigneeIds).size === input.assigneeIds.length, "Assignees must be unique.");
const listQuerySchema = z.object({ mine: z.enum(["true", "false"]).default("false"), limit: z.coerce.number().int().min(1).max(100).default(100), offset: z.coerce.number().int().min(0).max(100_000).default(0) }).strict();

export async function GET(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return fail(parsed.error);
    const visible = await visibleEmployeeIds(actor);
    const mine = parsed.data.mine === "true";
    const ids = mine ? (actor.employee ? [actor.employee.id] : []) : visible;
    const assignmentScope = ids === null ? {} : { assignees: { some: { employeeId: { in: ids }, unassignedAt: null } } };
    const where = ids === null ? {} : mine ? assignmentScope : { OR: [assignmentScope, { createdBy: actor.id }, { project: { memberships: { some: { employeeId: { in: ids }, leftAt: null } } } }, ...(actor.employee ? [{ project: { ownerEmployeeId: actor.employee.id } }, { project: { department: { headEmployeeId: actor.employee.id } } }] : [])] };
    const [items, total] = await Promise.all([
      db.task.findMany({ where, include: { project: true, assignees: { where: { unassignedAt: null }, include: { employee: { select: { id: true, fullName: true, employeeCode: true } } } } }, orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }, { id: "asc" }], take: parsed.data.limit, skip: parsed.data.offset }),
      db.task.count({ where }),
    ]);
    return ok({ items, total, limit: parsed.data.limit, offset: parsed.data.offset });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = schema.parse(await request.json());
    const project = input.projectId ? await db.project.findUnique({ where: { id: input.projectId }, include: { department: { select: { headEmployeeId: true } }, memberships: { where: { leftAt: null }, select: { employeeId: true, projectRole: true } } } }) : null;
    if (input.projectId && !project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
    const projectLead = Boolean(project && actor.employee && (project.ownerEmployeeId === actor.employee.id || project.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD")));
    if (!actor.roles.some(role => ["OWNER", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role)) && !projectLead) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to create tasks." } }, { status: 403 });
    const visible = await visibleEmployeeIds(actor);
    const projectMemberIds = project?.memberships.map(member => member.employeeId) ?? [];
    if (visible !== null && input.assigneeIds.some(id => !visible.includes(id) && !(projectLead && projectMemberIds.includes(id)))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "One or more assignees are outside your scope." } }, { status: 403 });
    if (input.assigneeIds.length) {
      const active = await db.employee.count({ where: { id: { in: input.assigneeIds }, lifecycleStatus: "ACTIVE" } });
      if (active !== input.assigneeIds.length) return NextResponse.json({ error: { code: "CONFLICT", message: "Tasks can only be assigned to active employees." } }, { status: 409 });
    }
    if (project) {
      if (actor.roles.includes("DEPARTMENT_HEAD") && !actor.roles.includes("OWNER") && !projectLead && project.department?.headEmployeeId !== actor.employee?.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Project is outside your department." } }, { status: 403 });
      if (actor.roles.includes("TEAM_LEAD") && !actor.roles.includes("OWNER") && !projectLead) {
        const ledDepartments = await db.team.findMany({ where: { leadEmployeeId: actor.employee?.id, active: true }, select: { departmentId: true } });
        if (!project.departmentId || !ledDepartments.some(team => team.departmentId === project.departmentId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Project is outside your team scope." } }, { status: 403 });
      }
    }
    const item = await db.$transaction(async tx => {
      const task = await tx.task.create({ data: { title: input.title, description: input.description, projectId: input.projectId, priority: input.priority, dueAt: input.dueAt, createdBy: actor.id } });
      await tx.taskStatusHistory.create({ data: { taskId: task.id, toStatus: "TODO", actorId: actor.id } });
      if (input.assigneeIds.length) await tx.taskAssignee.createMany({ data: input.assigneeIds.map(employeeId => ({ taskId: task.id, employeeId, assignedBy: actor.id })) });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.created", resourceType: "task", resourceId: task.id } });
      return task;
    });
    return ok(item, 201);
  } catch (error) { return fail(error); }
}
