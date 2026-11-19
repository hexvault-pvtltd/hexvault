import { currentUser } from "@core/lib/auth";
import { PerformanceError, publishReview } from "@core/features/performance/service";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid review identifier." } }, { status: 422 });
    const review = await db.performanceReview.findUnique({ where: { id } });
    if (!review) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found." } }, { status: 404 });
    const visible = await visibleEmployeeIds(actor);
    if (visible !== null && !visible.includes(review.employeeId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
    if (!actor.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only authorized managers can publish reviews." } }, { status: 403 });
    if (review.reviewerId !== actor.id && !actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the reviewer or HR/Owner can publish this review." } }, { status: 403 });
    return ok(await publishReview(id, actor.id));
  } catch (error) {
    if (error instanceof PerformanceError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    return fail(error);
  }
}
