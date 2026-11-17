import { currentUser } from "@core/lib/auth";
import { PerformanceError, updateDraftReview } from "@core/features/performance/service";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const managers = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];
const updateSchema = z.object({ periodStart: z.coerce.date(), periodEnd: z.coerce.date(), summary: z.string().trim().min(10).max(10_000) }).refine(value => value.periodStart <= value.periodEnd, "Period end must be on or after period start.");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid review identifier." } }, { status: 422 });
  const item = await db.performanceReview.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found." } }, { status: 404 });
  const visible = await visibleEmployeeIds(actor);
  if ((visible !== null && !visible.includes(item.employeeId)) || (!actor.roles.some(role => managers.includes(role)) && (actor.employee?.id !== item.employeeId || item.publicationStatus !== "PUBLISHED"))) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found." } }, { status: 404 });
  return ok(item);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => managers.includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only authorized managers can edit reviews." } }, { status: 403 });
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid review identifier." } }, { status: 422 });
    const item = await db.performanceReview.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found." } }, { status: 404 });
    const visible = await visibleEmployeeIds(actor);
    if (visible !== null && !visible.includes(item.employeeId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
    if (item.reviewerId !== actor.id && !actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the reviewer or HR/Owner can edit this draft." } }, { status: 403 });
    return ok(await updateDraftReview(id, actor.id, updateSchema.parse(await request.json())));
  } catch (error) {
    if (error instanceof PerformanceError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    return fail(error);
  }
}
