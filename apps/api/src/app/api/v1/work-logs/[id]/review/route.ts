import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { reviewWorkLog, WorkLogReviewError } from "@core/features/work-logs/service";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]), feedback: z.string().trim().max(2000).optional() }).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.some(role => ["OWNER", "DEPARTMENT_HEAD", "TEAM_LEAD", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to review journals." } }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid review decision." } }, { status: 422 });
  const { id } = await params;
  const log = await db.dailyWorkLog.findUnique({ where: { id }, select: { employeeId: true } });
  if (!log) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Work log not found." } }, { status: 404 });
  if (actor.employee?.id === log.employeeId) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot review your own journal." } }, { status: 403 });
  const visible = await visibleEmployeeIds(actor);
  if (visible !== null && !visible.includes(log.employeeId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Journal is outside your review scope." } }, { status: 403 });
  try {
    return ok(await reviewWorkLog(id, actor.id, parsed.data.decision, parsed.data.feedback));
  } catch (error) {
    if (error instanceof WorkLogReviewError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    console.error("work_log_review_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The journal could not be reviewed." } }, { status: 500 });
  }
}
