import { z } from "zod";
import { requireRole, AuthError } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({
  roles: z.array(z.enum(["OWNER", "DEPARTMENT_HEAD", "HR", "TEAM_LEAD", "STAFF", "INTERN"]))
    .min(1).refine(roles => new Set(roles).size === roles.length, { message: "Roles must be unique." }),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole("OWNER");
    const { id } = await params;
    const { roles } = schema.parse(await request.json());
    const target = await db.user.findUnique({ where: { id }, include: { roles: { where: { revokedAt: null }, include: { role: true } } } });
    if (!target) return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found." } }, { status: 404 });
    const roleRows = await db.role.findMany({ where: { code: { in: roles } } });
    if (roleRows.length !== new Set(roles).size) return NextResponse.json({ error: { code: "INVALID_ROLE", message: "One or more roles are not configured." } }, { status: 422 });
    const wasOwner = target.roles.some(row => row.role.code === "OWNER");
    const willBeOwner = roles.includes("OWNER");
    const assigned = await db.$transaction(async tx => {
      if (wasOwner && !willBeOwner) {
        const activeOwners = await tx.userRole.count({ where: { role: { code: "OWNER" }, revokedAt: null, user: { status: "ACTIVE" } } });
        if (activeOwners <= 1) throw new Error("LAST_OWNER");
      }
      await tx.userRole.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.userRole.createMany({ data: roleRows.map(role => ({ userId: id, roleId: role.id, assignedBy: actor.id })) });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "user.roles_updated", resourceType: "user", resourceId: id, metadata: { roles } } });
      return tx.userRole.findMany({ where: { userId: id, revokedAt: null }, include: { role: true } });
    }, { isolationLevel: "Serializable" });
    return ok(assigned.map(row => row.role.code));
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    if (error instanceof Error && error.message === "LAST_OWNER") return NextResponse.json({ error: { code: "LAST_OWNER", message: "The last active Owner role cannot be removed." } }, { status: 409 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return NextResponse.json({ error: { code: "CONCURRENT_ROLE_CHANGE", message: "Roles changed concurrently. Refresh and try again." } }, { status: 409 });
    return fail(error);
  }
}
