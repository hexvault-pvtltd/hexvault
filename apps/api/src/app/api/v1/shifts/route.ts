import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { createShiftAssignment } from "@core/features/attendance/shift-assignments";

const schema = z.object({ employeeId: z.string().uuid(), shiftId: z.string().uuid(), validFrom: z.coerce.date(), validTo: z.coerce.date().optional() }).refine(value => !value.validTo || value.validTo >= value.validFrom, { message: "End date must be on or after the start date." });
export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const visible = await visibleEmployeeIds(actor);
  const items = await db.shiftAssignment.findMany({ where: visible === null ? {} : { employeeId: { in: visible } }, include: { shift: true, employee: { select: { id: true, employeeCode: true, fullName: true } } }, orderBy: { validFrom: "desc" }, take: 200 });
  return ok({ items, total: items.length });
}
export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can assign shifts." } }, { status: 403 });
    const input = schema.parse(await request.json());
    const [employee, shift] = await Promise.all([db.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, lifecycleStatus: true } }), db.shift.findUnique({ where: { id: input.shiftId } })]);
    if (!employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    if (!shift || !shift.active) return NextResponse.json({ error: { code: "INVALID_SHIFT", message: "Select an active shift." } }, { status: 422 });
    if (employee.lifecycleStatus === "EXITED") return NextResponse.json({ error: { code: "CONFLICT", message: "Exited employees cannot receive shift assignments." } }, { status: 409 });
    const assignment = await createShiftAssignment(actor.id, input);
    return ok(assignment, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_ASSIGNMENT_OVERLAP") return NextResponse.json({ error: { code: "CONFLICT", message: "This employee already has a shift assignment that overlaps those dates." } }, { status: 409 });
    return fail(error);
  }
}
