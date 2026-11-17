import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { decideAttendanceCorrection } from "@core/features/attendance/corrections";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to decide attendance corrections." } }, { status: 403 });
    const { id } = await params;
    const { decision } = schema.parse(await request.json());
    const correction = await db.attendanceCorrection.findUnique({ where: { id }, include: { session: true } });
    if (!correction) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Correction request not found." } }, { status: 404 });
    const visible = await visibleEmployeeIds(actor);
    if (visible !== null && !visible.includes(correction.employeeId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Request is outside your approval scope." } }, { status: 403 });
    if (correction.status !== "PENDING") return NextResponse.json({ error: { code: "CONFLICT", message: "This correction has already been decided." } }, { status: 409 });
    const outcome = await decideAttendanceCorrection(id, actor.id, decision);
    return ok(outcome);
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_DECIDED") return NextResponse.json({ error: { code: "CONFLICT", message: "This correction has already been decided." } }, { status: 409 });
    if (error instanceof Error && error.message === "CHECK_IN_REQUIRED") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "A new attendance session needs a corrected check-in time." } }, { status: 422 });
    if (error instanceof Error && error.message === "SESSION_CHANGED") return NextResponse.json({ error: { code: "CONFLICT", message: "Attendance changed after this request was submitted. Review the latest record and submit a new correction." } }, { status: 409 });
    return fail(error);
  }
}
