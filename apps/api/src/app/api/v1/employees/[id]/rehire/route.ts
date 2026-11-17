import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

const schema = z.object({ employmentType: z.string().trim().min(2).max(40), title: z.string().trim().max(120).nullable().optional(), startDate: z.string().date(), reason: z.string().trim().min(3).max(500) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the Owner can rehire former employees." } }, { status: 403 });
    const { id } = await params;
    const input = schema.parse(await request.json());
    const existing = await db.employee.findUnique({ where: { id }, include: { user: { select: { id: true, status: true } }, periods: { where: { endDate: null }, select: { id: true } } } });
    if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    if (existing.lifecycleStatus !== "EXITED" || existing.periods.length > 0) return NextResponse.json({ error: { code: "CONFLICT", message: "Only a former employee with no open employment period can be rehired." } }, { status: 409 });
    const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
    if (startDate > new Date()) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "The rehire start date cannot be in the future." } }, { status: 422 });
    const result = await db.$transaction(async tx => {
      const employee = await tx.employee.update({ where: { id }, data: { lifecycleStatus: "ACTIVE", ...(input.title !== undefined ? { title: input.title } : {}) } });
      if (existing.user) await tx.user.update({ where: { id: existing.user.id }, data: { status: "ACTIVE" } });
      const period = await tx.employmentPeriod.create({ data: { employeeId: id, employmentType: input.employmentType, title: input.title ?? existing.title, startDate, status: "ACTIVE" } });
      await tx.employeeHistory.create({ data: { employeeId: id, eventType: "REHIRED", actorId: actor.id, oldData: { lifecycleStatus: existing.lifecycleStatus, accountStatus: existing.user?.status ?? null }, newData: { lifecycleStatus: "ACTIVE", accountStatus: existing.user ? "ACTIVE" : null, employmentPeriodId: period.id, employmentType: input.employmentType, startDate, reason: input.reason } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "employee.rehired", resourceType: "employee", resourceId: id, metadata: { employmentPeriodId: period.id, reason: input.reason } } });
      return { employee, period };
    });
    return ok(result, 201);
  } catch (error) { return fail(error); }
}
