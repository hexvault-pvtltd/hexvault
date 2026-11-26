import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { OrganizationError } from "@core/features/organization/structure";
import { syncEmployeeTeams, validateOrganizationSelection } from "@core/features/organization/selection";
import { employeeCodeSchema, lockEmployeeNumbers } from "./numbering";

const updateSchema = z.object({
  employeeCode: employeeCodeSchema.optional(),
  fullName: z.string().trim().min(2).max(120).optional(),
  workEmail: z.string().email().max(254).optional(),
  title: z.string().trim().max(120).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  teamIds: z.array(z.string().uuid()).max(50).optional(),
}).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const visible = await visibleEmployeeIds(actor);
  if (visible !== null && !visible.includes(id)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
  const elevated = actor.roles.some(role => ["OWNER", "HR"].includes(role));
  const employee = await db.employee.findUnique({
    where: { id },
    select: {
      id: true, employeeCode: true, fullName: true, workEmail: true, phone: true, title: true,
      lifecycleStatus: true, department: { select: { id: true, name: true, code: true } },
      periods: { orderBy: { startDate: "desc" }, select: { id: true, employmentType: true, title: true, startDate: true, endDate: true, status: true, ...(elevated ? { exitReason: true } : {}) } },
      memberships: { where: { endedAt: null }, select: { id: true, team: { select: { id: true, name: true, departmentId: true } }, startedAt: true } },
    },
  });
  return employee ? ok(employee) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to edit employee records." } }, { status: 403 });
    }
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const current = await db.employee.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    const { teamIds, ...fields } = input;
    const data = { ...fields, ...(input.workEmail ? { workEmail: input.workEmail.trim().toLowerCase() } : {}) };
    const updated = await db.$transaction(async tx => {
      if (input.employeeCode !== undefined) await lockEmployeeNumbers(tx);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`employee-organization:${id}`}))`;
      const latest = await tx.employee.findUniqueOrThrow({ where: { id } });
      const memberships = await tx.teamMembership.findMany({ where: { employeeId: id, endedAt: null }, select: { teamId: true } });
      const oldTeams = [...new Set(memberships.map(item => item.teamId))];
      const departmentId = input.departmentId === undefined ? latest.departmentId : input.departmentId;
      const selectedTeams = teamIds ?? (departmentId !== latest.departmentId ? [] : oldTeams);
      await validateOrganizationSelection(tx, departmentId, selectedTeams, { departmentId: latest.departmentId, teamIds: oldTeams });
      if (departmentId !== latest.departmentId) {
        const [ledTeams, headedDepartments] = await Promise.all([
          tx.team.count({ where: { leadEmployeeId: id, active: true, ...(departmentId ? { departmentId: { not: departmentId } } : {}) } }),
          tx.department.count({ where: { headEmployeeId: id, active: true, ...(departmentId ? { id: { not: departmentId } } : {}) } }),
        ]);
        if (ledTeams || headedDepartments) throw new OrganizationError(409, "CONFLICT", "Reassign this employee's department or team leadership before moving them to another department.");
      }
      const employee = await tx.employee.update({ where: { id }, data });
      await syncEmployeeTeams(tx, id, selectedTeams, actor.id);
      await tx.employeeHistory.create({
        data: { employeeId: id, eventType: "PROFILE_UPDATED", actorId: actor.id, oldData: { employeeCode: latest.employeeCode, fullName: latest.fullName, workEmail: latest.workEmail, title: latest.title, departmentId: latest.departmentId }, newData: data },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "employee.profile_updated", resourceType: "employee", resourceId: id } });
      return employee;
    });
    return ok(updated);
  } catch (error) {
    if (error instanceof OrganizationError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return fail(error);
  }
}
