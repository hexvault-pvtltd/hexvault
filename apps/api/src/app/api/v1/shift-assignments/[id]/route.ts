import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { setShiftAssignmentEndDate } from "@core/features/attendance/shift-assignments";

const schema = z.object({ validTo: z.coerce.date() }).strict();
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage shift assignments." } }, { status: 403 });
    const { id } = await params; const { validTo } = schema.parse(await request.json());
    const current = await db.shiftAssignment.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Shift assignment not found." } }, { status: 404 });
    const result = await setShiftAssignmentEndDate(actor.id, id, validTo);
    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_ASSIGNMENT_OVERLAP") return NextResponse.json({ error: { code: "CONFLICT", message: "The assignment end date overlaps another shift." } }, { status: 409 });
    if (error instanceof Error && error.message === "SHIFT_ASSIGNMENT_INVALID_END") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "End date must be on or after the start date." } }, { status: 422 });
    return fail(error);
  }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage shift assignments." } }, { status: 403 });
  const { id } = await params;
  const assignment = await db.shiftAssignment.findUnique({ where: { id }, include: { sessions: { select: { id: true }, take: 1 } } });
  if (!assignment) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Shift assignment not found." } }, { status: 404 });
  if (assignment.sessions.length) return NextResponse.json({ error: { code: "CONFLICT", message: "This assignment has attendance history; set an end date to retain that history." } }, { status: 409 });
  await db.$transaction(async tx => {
    await tx.shiftAssignment.delete({ where: { id } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "shift.assignment_deleted", resourceType: "shift_assignment", resourceId: id } });
  });
  return ok({ deleted: true });
}
