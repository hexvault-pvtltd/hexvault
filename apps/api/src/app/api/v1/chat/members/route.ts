import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok, fail } from "@core/lib/http";
import { NextResponse } from "next/server";

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to use chat." } }, { status: 401 });
  try {
    const employees = await db.employee.findMany({
      where: { lifecycleStatus: { in: ["ACTIVE", "ON_LEAVE"] }, userId: { not: actor.id }, user: { is: { status: "ACTIVE" } } },
      select: { id: true, fullName: true, employeeCode: true, title: true, department: { select: { name: true } }, user: { select: { id: true } } },
      orderBy: { fullName: "asc" },
      take: 500,
    });
    return ok({ items: employees.filter(employee => employee.user).map(employee => ({ userId: employee.user!.id, employeeId: employee.id, fullName: employee.fullName, employeeCode: employee.employeeCode, title: employee.title, department: employee.department?.name ?? null })) });
  } catch (error) { return fail(error); }
}
