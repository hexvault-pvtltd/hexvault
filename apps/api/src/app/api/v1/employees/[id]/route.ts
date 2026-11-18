import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";

const updateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  workEmail: z.string().email().optional(),
  title: z.string().max(120).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
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
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to edit employee records." } }, { status: 403 });
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const current = await db.employee.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    const data = { ...input, ...(input.workEmail ? { workEmail: input.workEmail.trim().toLowerCase() } : {}) };
    const updated = await db.$transaction(async tx => {
      const employee = await tx.employee.update({ where: { id }, data });
      await tx.employeeHistory.create({ data: { employeeId: id, eventType: "PROFILE_UPDATED", actorId: actor.id, oldData: { fullName: current.fullName, workEmail: current.workEmail, title: current.title, departmentId: current.departmentId }, newData: data } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "employee.profile_updated", resourceType: "employee", resourceId: id } });
      return employee;
    });
    return ok(updated);
  } catch (error) { return fail(error); }
}
