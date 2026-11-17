import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextResponse } from "next/server";

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const visible = await visibleEmployeeIds(actor);
    const employeeScope = visible === null ? {} : { id: { in: visible } };
    const [employees, relationships] = await Promise.all([
      db.employee.findMany({ where: { ...employeeScope, lifecycleStatus: "ACTIVE" }, select: { id: true, fullName: true, employeeCode: true, title: true, department: { select: { id: true, name: true } } }, orderBy: { fullName: "asc" }, take: 500 }),
      db.reportingRelationship.findMany({ where: { endedAt: null, employee: employeeScope, supervisor: employeeScope }, select: { employeeId: true, supervisorEmployeeId: true } }),
    ]);
    return ok({ employees, relationships, truncated: employees.length === 500 });
  } catch (error) { return fail(error); }
}
