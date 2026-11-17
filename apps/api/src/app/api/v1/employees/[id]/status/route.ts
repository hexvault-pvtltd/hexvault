import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]), reason: z.string().trim().min(3).max(500) }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the Owner can change employee account status." } }, { status: 403 });
    const { id } = await params;
    const input = schema.parse(await request.json());
    const existing = await db.employee.findUnique({ where: { id }, include: { user: { select: { id: true, status: true } } } });
    if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    if (existing.lifecycleStatus === "EXITED") return NextResponse.json({ error: { code: "CONFLICT", message: "Exited employees must use the rehire workflow." } }, { status: 409 });
    const userStatus = input.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED";
    if (existing.lifecycleStatus === input.status && existing.user?.status === userStatus) return ok({ id, status: input.status, changed: false });
    await db.$transaction(async tx => {
      await tx.employee.update({ where: { id }, data: { lifecycleStatus: input.status } });
      if (existing.user) {
        await tx.user.update({ where: { id: existing.user.id }, data: { status: userStatus } });
        if (input.status === "SUSPENDED") await tx.session.updateMany({ where: { userId: existing.user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.employeeHistory.create({ data: { employeeId: id, eventType: input.status === "SUSPENDED" ? "SUSPENDED" : "REACTIVATED", actorId: actor.id, oldData: { lifecycleStatus: existing.lifecycleStatus, accountStatus: existing.user?.status ?? null }, newData: { lifecycleStatus: input.status, accountStatus: userStatus, reason: input.reason } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: input.status === "SUSPENDED" ? "employee.suspended" : "employee.reactivated", resourceType: "employee", resourceId: id, metadata: { reason: input.reason } } });
    });
    return ok({ id, status: input.status, changed: true });
  } catch (error) { return fail(error); }
}
