import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { submitAttendanceCorrection } from "@core/features/attendance/corrections";
import { NextRequest, NextResponse } from "next/server";

const requestSchema = z.object({
  workDate: z.coerce.date(),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  reason: z.string().trim().min(5).max(1000),
}).refine(value => value.checkInAt || value.checkOutAt, "Provide a corrected check-in or check-out time.")
  .refine(value => !value.checkInAt || !value.checkOutAt || new Date(value.checkOutAt) > new Date(value.checkInAt), "Check-out must be after check-in.");

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const visible = await visibleEmployeeIds(actor);
  const records = await db.attendanceCorrection.findMany({
    where: visible === null ? {} : { employeeId: { in: visible } },
    include: { session: true },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  const employees = await db.employee.findMany({ where: { id: { in: records.map(record => record.employeeId) } }, select: { id: true, employeeCode: true, fullName: true } });
  const byId = new Map(employees.map(employee => [employee.id, employee]));
  const items = records.map(record => ({ ...record, employee: byId.get(record.employeeId) }));
  return ok({ items, total: items.length });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.employee) return NextResponse.json({ error: { code: "EMPLOYEE_REQUIRED", message: "Your account is not linked to an employee profile." } }, { status: 409 });
    const input = requestSchema.parse(await request.json());
    const correction = await submitAttendanceCorrection(actor.employee.id, actor.id, { workDate: input.workDate, checkInAt: input.checkInAt ? new Date(input.checkInAt) : undefined, checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : undefined, reason: input.reason });
    return ok(correction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "CORRECTION_PENDING") return NextResponse.json({ error: { code: "CONFLICT", message: "A correction request is already pending for this work date." } }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_CORRECTION_RANGE") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check-out must be later than the recorded check-in." } }, { status: 422 });
    return fail(error);
  }
}
