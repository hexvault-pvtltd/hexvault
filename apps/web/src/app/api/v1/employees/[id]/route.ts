import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { currentUser } from "@core/lib/auth";
import { applicationUrl } from "@core/lib/app-url";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can update employee passwords." } }, { status: 403 });
    }

    const { id } = await params;
    const employee = await db.employee.findUnique({
      where: { id },
      select: { id: true, fullName: true, user: { select: { id: true, email: true, status: true } } },
    });
    if (!employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    const account = employee.user;
    if (!account || account.status !== "ACTIVE") {
      return NextResponse.json({ error: { code: "ACCOUNT_NOT_ACTIVE", message: "This employee does not have an active account whose password can be updated." } }, { status: 409 });
    }

    const temporaryPassword = randomBytes(24).toString("base64url");
    const passwordHash = await hash(temporaryPassword, 12);
    await db.$transaction(async tx => {
      await tx.user.update({ where: { id: account.id }, data: { passwordHash } });
      await tx.session.updateMany({ where: { userId: account.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.passwordResetToken.deleteMany({ where: { userId: account.id } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "auth.password_updated_by_admin",
          resourceType: "user",
          resourceId: account.id,
        },
      });
    });

    return ok({
      employeeName: employee.fullName,
      loginEmail: account.email,
      temporaryPassword,
      loginUrl: applicationUrl(new URL(_request.url).origin),
    });
  } catch (error) {
    return fail(error);
  }
}
