import { currentUser } from "@core/lib/auth";
import { updateGoal } from "@core/features/performance/service";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const managers = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];
const updateSchema = z.object({ status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(), progressNote: z.string().max(2000).nullable().optional() }).refine(value => Object.keys(value).length > 0, "Provide a goal field to update.");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid goal identifier." } }, { status: 422 });
    const goal = await db.employeeGoal.findUnique({ where: { id } });
    if (!goal) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Goal not found." } }, { status: 404 });
    const visible = await visibleEmployeeIds(actor);
    if (visible !== null && !visible.includes(goal.employeeId)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Goal not found." } }, { status: 404 });
    const isManager = actor.roles.some(role => managers.includes(role));
    if (!isManager && actor.employee?.id !== goal.employeeId) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot edit this goal." } }, { status: 403 });
    return ok(await updateGoal(id, actor.id, updateSchema.parse(await request.json())));
  } catch (error) { return fail(error); }
}
