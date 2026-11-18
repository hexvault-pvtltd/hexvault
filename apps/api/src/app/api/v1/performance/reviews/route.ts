import { currentUser } from "@core/lib/auth";
import { createReview, PerformanceError } from "@core/features/performance/service";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const managerRoles = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];
const createSchema = z.object({ employeeId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(), summary: z.string().trim().min(10).max(10_000) }).refine(value => value.periodStart <= value.periodEnd, "Period end must be on or after period start.");
const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(10_000).default(0) }).strict();

export async function GET(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const parsed = listSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid page parameters." } }, { status: 422 });
  const visible = await visibleEmployeeIds(actor);
  const selfOnly = !actor.roles.some(role => managerRoles.includes(role));
  const where = { ...(selfOnly ? { employeeId: actor.employee?.id ?? "", publicationStatus: "PUBLISHED" } : {}), ...(visible === null ? {} : { employeeId: { in: visible } }) };
  const [items, total] = await Promise.all([db.performanceReview.findMany({ where, orderBy: [{ periodEnd: "desc" }, { id: "desc" }], take: parsed.data.limit, skip: parsed.data.offset }), db.performanceReview.count({ where })]);
  return ok({ items, total, limit: parsed.data.limit, offset: parsed.data.offset });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => managerRoles.includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only authorized managers can create reviews." } }, { status: 403 });
    const input = createSchema.parse(await request.json());
    const visible = await visibleEmployeeIds(actor);
    if (visible !== null && !visible.includes(input.employeeId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
    if (input.employeeId === actor.employee?.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot review yourself." } }, { status: 403 });
    return ok(await createReview(actor.id, input), 201);
  } catch (error) {
    if (error instanceof PerformanceError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    return fail(error);
  }
}
