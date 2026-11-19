import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { taskCreateSchema, resolveTaskAssignees, TaskAssignmentError } from "@core/features/tasks/assignment-input";
import { activeTeamPeople, assignmentTeamSelect, taskCreationScope } from "@core/features/tasks/creation-scope";

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
    const input = taskCreateSchema.parse(await request.json());
    const scope = await taskCreationScope(actor, input.projectId);
    const item = await db.$transaction(async tx => {
      const team = input.teamId ? await tx.team.findFirst({ where: { id: input.teamId, active: true }, select: assignmentTeamSelect }) : null;
      const ids = resolveTaskAssignees(input, team ? activeTeamPeople(team).map(person => person.id) : null, scope);
      if (ids.length) {
        const active = await tx.employee.count({ where: { id: { in: ids }, lifecycleStatus: "ACTIVE" } });
        if (active !== ids.length) throw new TaskAssignmentError(409, "CONFLICT", "Tasks can only be assigned to active employees. Refresh the team and try again.");
      }
      const task = await tx.task.create({ data: { title: input.title, description: input.description, projectId: input.projectId, priority: input.priority, dueAt: input.dueAt, createdBy: actor.id } });
      await tx.taskStatusHistory.create({ data: { taskId: task.id, toStatus: "TODO", actorId: actor.id } });
      if (ids.length) await tx.taskAssignee.createMany({ data: ids.map(employeeId => ({ taskId: task.id, employeeId, assignedBy: actor.id })) });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.created", resourceType: "task", resourceId: task.id, metadata: { teamId: input.teamId ?? null, assignmentMode: input.assignWholeTeam ? "TEAM" : ids.length ? "MEMBERS" : "UNASSIGNED", assigneeIds: ids } } });
      return task;
    });
    return ok(item, 201);
  } catch (error) {
    if (error instanceof TaskAssignmentError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return fail(error);
  }
}
