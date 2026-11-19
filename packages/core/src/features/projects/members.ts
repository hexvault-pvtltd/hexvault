import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { canManageProject, canReadProject } from "@core/features/projects/permissions";
import { NextResponse } from "next/server";

const schema = z.object({ employeeId: z.string().uuid(), projectRole: z.enum(["LEAD", "CONTRIBUTOR", "OBSERVER"]).default("CONTRIBUTOR") }).strict();
const include = { department: { select: { id: true, headEmployeeId: true } }, memberships: { where: { leftAt: null }, select: { employeeId: true, projectRole: true } } } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include });
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  if (!await canReadProject(actor, project)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Project is outside your scope." } }, { status: 403 });
  const visible = actor.roles.includes("TEAM_LEAD") ? await visibleEmployeeIds(actor) : null;
  const items = await db.projectMembership.findMany({ where: { projectId: id, leftAt: null, ...(visible !== null ? { employeeId: { in: visible } } : {}) }, include: { employee: { select: { id: true, fullName: true, employeeCode: true, title: true } } }, orderBy: [{ projectRole: "asc" }, { joinedAt: "asc" }] });
  return ok({ items, total: items.length });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = schema.parse(await request.json());
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id }, include });
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
    if (!await canManageProject(actor, project)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot manage project membership." } }, { status: 403 });
    const visible = await visibleEmployeeIds(actor);
    const projectDelegatedManager = actor.employee && (project.ownerEmployeeId === actor.employee.id || project.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD"));
    if (visible !== null && !visible.includes(input.employeeId) && !projectDelegatedManager) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
    const employee = await db.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, lifecycleStatus: true, departmentId: true } });
    if (!employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    if (employee.lifecycleStatus !== "ACTIVE") return NextResponse.json({ error: { code: "CONFLICT", message: "Only active employees can join a project." } }, { status: 409 });
    if (project.departmentId && employee.departmentId !== project.departmentId && !actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside the project department." } }, { status: 403 });
    const prior = await db.projectMembership.findFirst({ where: { projectId: id, employeeId: employee.id }, orderBy: { joinedAt: "desc" } });
    if (prior && prior.leftAt === null) return NextResponse.json({ error: { code: "CONFLICT", message: "Employee is already a project member." } }, { status: 409 });
    const result = await db.$transaction(async tx => {
      const membership = prior
        ? await tx.projectMembership.update({ where: { id: prior.id }, data: { joinedAt: new Date(), leftAt: null, projectRole: input.projectRole } })
        : await tx.projectMembership.create({ data: { projectId: id, employeeId: employee.id, projectRole: input.projectRole } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: prior ? "project.member_rejoined" : "project.member_added", resourceType: "project", resourceId: id, metadata: { employeeId: employee.id, projectRole: input.projectRole } } });
      return membership;
    });
    return ok(result, prior ? 200 : 201);
  } catch (error) { return fail(error); }
}
