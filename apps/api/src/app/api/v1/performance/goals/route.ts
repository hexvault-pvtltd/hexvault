import { currentUser } from "@core/lib/auth";
import { createGoal } from "@core/features/performance/service";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const managers = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];
const createSchema = z.object({ employeeId: z.string().uuid().optional(), title: z.string().trim().min(2).max(160), description: z.string().max(4000).nullable().optional(), targetDate: z.coerce.date().nullable().optional() });
const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(10_000).default(0) }).strict();

export async function GET(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid page parameters." } }, { status: 422 });
  const visible = await visibleEmployeeIds(actor);
  const where = visible === null ? {} : { employeeId: { in: visible } };
  const [items, total] = await Promise.all([db.employeeGoal.findMany({ where, orderBy: [{ targetDate: "asc" }, { id: "asc" }], take: parsed.data.limit, skip: parsed.data.offset }), db.employeeGoal.count({ where })]);
  return ok({ items, total, limit: parsed.data.limit, offset: parsed.data.offset });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const input = createSchema.parse(await request.json());
    const isManager = actor.roles.some(role => managers.includes(role));
    const employeeId = input.employeeId ?? actor.employee?.id;
    if (!employeeId) return NextResponse.json({ error: { code: "EMPLOYEE_REQUIRED", message: "Choose an employee profile." } }, { status: 422 });
    if (!isManager && employeeId !== actor.employee?.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You can only create your own goals." } }, { status: 403 });
    const visible = await visibleEmployeeIds(actor);
    if (visible !== null && !visible.includes(employeeId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
    return ok(await createGoal(actor.id, { ...input, employeeId }), 201);
  } catch (error) { return fail(error); }
}
