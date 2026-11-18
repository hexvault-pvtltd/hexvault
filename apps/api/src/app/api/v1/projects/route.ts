import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({
  code: z.string().trim().min(2).max(32).transform(value => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  description: z.string().max(4000).optional(),
  departmentId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
}).refine(value => !value.startDate || !value.dueDate || value.startDate <= value.dueDate, { path: ["dueDate"], message: "Due date must be on or after the start date." });

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const visible = await visibleEmployeeIds(actor);
  const scopedProjects = [
    { memberships: { some: { employeeId: { in: visible ?? [] }, leftAt: null } } },
    ...(actor.employee ? [{ ownerEmployeeId: actor.employee.id }, { department: { headEmployeeId: actor.employee.id } }] : []),
  ];
  const projects = await db.project.findMany({ where: visible === null ? {} : { OR: scopedProjects }, include: { department: true, _count: { select: { tasks: true, memberships: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return ok({ items: projects, total: projects.length });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "DEPARTMENT_HEAD"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to create projects." } }, { status: 403 });
    const input = schema.parse(await request.json());
    let departmentId = input.departmentId ?? null;
    if (actor.roles.includes("DEPARTMENT_HEAD") && !actor.roles.includes("OWNER")) {
      if (!departmentId) {
        const assigned = await db.department.findFirst({ where: { headEmployeeId: actor.employee?.id }, select: { id: true } });
        departmentId = assigned?.id ?? null;
      }
      if (!departmentId) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Assign a department before creating projects." } }, { status: 403 });
      const department = await db.department.findUnique({ where: { id: departmentId }, select: { headEmployeeId: true } });
      if (department?.headEmployeeId !== actor.employee?.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Department is outside your scope." } }, { status: 403 });
    }
    const project = await db.$transaction(async tx => {
      const created = await tx.project.create({ data: { ...input, departmentId, ownerEmployeeId: actor.employee?.id ?? null, description: input.description ?? null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "project.created", resourceType: "project", resourceId: created.id } });
      return created;
    });
    return ok(project, 201);
  } catch (error) { return fail(error); }
}
