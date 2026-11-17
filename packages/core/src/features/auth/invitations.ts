import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { createSession, currentUser, hashToken, SESSION_COOKIE, sessionCookieSecure } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const inviteSchema = z.object({
  employeeId: z.string().uuid(),
  role: z.enum(["OWNER", "DEPARTMENT_HEAD", "HR", "TEAM_LEAD", "STAFF", "INTERN"]).default("STAFF"),
});
const acceptSchema = z.object({ token: z.string().min(32).max(200), password: z.string().min(14).max(200) });
const onboardingItems = ["Review company handbook", "Complete security and privacy orientation", "Meet your team lead", "Set up required work tools"];

export async function inviteEmployee(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const owner = actor.roles.includes("OWNER");
    const hr = actor.roles.includes("HR");
    if (!owner && !hr) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to create invitations." } }, { status: 403 });

    const input = inviteSchema.parse(await request.json());
    if (hr && !owner && !["STAFF", "INTERN"].includes(input.role)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "HR can invite new staff and interns; other roles require an Owner." } }, { status: 403 });
    }

    const employee = await db.employee.findUnique({ where: { id: input.employeeId }, select: { id: true, fullName: true, workEmail: true, userId: true } });
    if (!employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    if (employee.userId) return NextResponse.json({ error: { code: "CONFLICT", message: "Employee already has an account." } }, { status: 409 });
    const roleNames = {
      OWNER: "Owner",
      DEPARTMENT_HEAD: "Department Head",
      HR: "Human Resources",
      TEAM_LEAD: "Team Lead",
      STAFF: "Staff",
      INTERN: "Intern",
    };
    const role = await db.role.upsert({
      where: { code: input.role },
      update: {},
      create: { code: input.role, name: roleNames[input.role] },
    });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const email = employee.workEmail.trim().toLowerCase();
    await db.$transaction(async tx => {
      const account = await tx.user.create({
        data: { email, passwordHash: await hash(randomBytes(48).toString("base64url"), 12), status: "INVITED", employee: { connect: { id: employee.id } } },
      });
      await tx.userRole.create({ data: { userId: account.id, roleId: role.id, assignedBy: actor.id } });
      await tx.invitation.create({ data: { email, employeeId: employee.id, tokenHash, invitedBy: actor.id, expiresAt } });
      await tx.auditLog.create({
        data: { actorId: actor.id, action: "employee.invited", resourceType: "employee", resourceId: employee.id, metadata: { role: input.role, channel: "whatsapp_manual" } },
      });
    });

    const invitationUrl = `${process.env.APP_URL ?? new URL(request.url).origin}/accept-invitation?token=${encodeURIComponent(token)}`;
    return ok({ invitationCreated: true, employeeName: employee.fullName, email, role: input.role, invitationUrl, expiresAt }, 201);
  } catch (error) {
    return fail(error);
  }
}

export async function acceptInvitation(request: NextRequest) {
  try {
    const { token, password } = acceptSchema.parse(await request.json());
    const invitation = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      return NextResponse.json({ error: { code: "INVALID_INVITATION", message: "This invitation is invalid or expired." } }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);
    const account = await db.$transaction(async tx => {
      const used = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (!used.count) throw new Error("INVITATION_ALREADY_USED");
      const user = await tx.user.update({ where: { email: invitation.email }, data: { passwordHash, status: "ACTIVE" } });
      if (invitation.employeeId && !await tx.onboardingCase.findFirst({ where: { employeeId: invitation.employeeId, status: { in: ["OPEN", "IN_PROGRESS"] } } })) {
        await tx.onboardingCase.create({ data: { employeeId: invitation.employeeId, items: { create: onboardingItems.map(title => ({ title })) } } });
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: "invitation.accepted", resourceType: "user", resourceId: user.id } });
      return user;
    });

    const sessionToken = await createSession(account.id);
    const response = ok({ accepted: true });
    response.cookies.set(SESSION_COOKIE, sessionToken, { httpOnly: true, secure: sessionCookieSecure(), sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "INVITATION_ALREADY_USED") {
      return NextResponse.json({ error: { code: "INVALID_INVITATION", message: "This invitation is invalid or expired." } }, { status: 400 });
    }
    return fail(error);
  }
}
