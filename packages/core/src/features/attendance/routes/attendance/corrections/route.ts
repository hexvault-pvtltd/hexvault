import { correctionRequestSchema } from "@core/features/attendance/correction-input";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { submitAttendanceCorrection } from "@core/features/attendance/corrections";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const visible = await visibleEmployeeIds(actor);
  const records = await db.attendanceCorrection.findMany({
    where: visible === null ? {} : { employeeId: { in: [...new Set([...visible, ...(actor.employee ? [actor.employee.id] : [])])] } },
    include: { session: true },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  const employees = await db.employee.findMany({ where: { id: { in: records.map(record => record.employeeId) } }, select: { id: true, employeeCode: true, fullName: true } });
  const byId = new Map(employees.map(employee => [employee.id, employee]));
  const items = records.map(record => ({ ...record, employee: byId.get(record.employeeId), canReview: actor.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD"].includes(role)) && (visible === null || visible.includes(record.employeeId)) }));
  return ok({ items, total: items.length });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.employee) return NextResponse.json({ error: { code: "EMPLOYEE_REQUIRED", message: "Your account is not linked to an employee profile." } }, { status: 409 });
    const input = correctionRequestSchema.parse(await request.json());
    const correction = await submitAttendanceCorrection(actor.employee.id, actor.id, input);
    return ok(correction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "CORRECTION_PENDING") return NextResponse.json({ error: { code: "CONFLICT", message: "A correction request is already pending for this work date." } }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_CORRECTION_RANGE") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Check-out must be later than the recorded check-in." } }, { status: 422 });
    if (error instanceof Error && ["SESSION_NOT_FOUND", "SESSION_REQUIRED", "CHECK_IN_REQUIRED"].includes(error.message)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: error.message === "SESSION_REQUIRED" ? "Select the attendance session to correct." : error.message === "SESSION_NOT_FOUND" ? "The selected session does not belong to your work date." : "Provide a check-in time when adding a missing session." } }, { status: 422 });
    return fail(error);
  }
}
