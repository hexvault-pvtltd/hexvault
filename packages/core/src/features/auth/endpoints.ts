import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { currentUser, hashToken, SESSION_COOKIE, sessionCookieSecure } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { sendMail } from "@core/lib/email";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const forgotSchema = z.object({ email: z.string().email().max(254) });
const resetSchema = z.object({ token: z.string().min(32).max(200), password: z.string().min(14).max(200) });

export async function forgotPassword(request: NextRequest) {
  try {
    const { email: raw } = forgotSchema.parse(await request.json());
    const email = raw.trim().toLowerCase();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await db.loginEvent.count({ where: { ip, success: false, createdAt: { gte: since } } });
    if (count < 6) {
      await db.loginEvent.create({ data: { emailAttempted: email, success: false, ip, userAgent: request.headers.get("user-agent") } });
      const user = await db.user.findUnique({ where: { email } });
      if (user?.status === "ACTIVE") {
        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const saved = await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } });
        try {
          const link = `${process.env.APP_URL ?? new URL(request.url).origin}/reset-password?token=${encodeURIComponent(token)}`;
          await sendMail({ to: user.email, subject: "Reset your HEXVAULT password", text: `Use this one-time link to reset your password. It expires in 30 minutes: ${link}`, html: `<p>Use this one-time link to reset your password. It expires in 30 minutes.</p><p><a href="${link}">Reset password</a></p>` });
        } catch (error) {
          await db.passwordResetToken.delete({ where: { id: saved.id } });
          const mailError = error && typeof error === "object" ? error as { name?: unknown; code?: unknown; responseCode?: unknown; command?: unknown } : null;
          console.error("password_reset_email_failed", {
            name: typeof mailError?.name === "string" ? mailError.name : "unknown",
            code: typeof mailError?.code === "string" ? mailError.code : undefined,
            responseCode: typeof mailError?.responseCode === "number" ? mailError.responseCode : undefined,
            command: typeof mailError?.command === "string" ? mailError.command : undefined,
          });
        }
      }
    }
    return ok({ message: "If an active account matches that address, reset instructions will be sent." });
  } catch (error) { return fail(error); }
}

export async function resetPassword(request: NextRequest) {
  try {
    const { token, password } = resetSchema.parse(await request.json());
    const tokenHash = hashToken(token);
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) return NextResponse.json({ error: { code: "INVALID_RESET_TOKEN", message: "This reset link is invalid or has expired." } }, { status: 400 });
    const passwordHash = await hash(password, 12);
    await db.$transaction(async tx => {
      const consumed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!consumed.count) throw new Error("RESET_TOKEN_ALREADY_USED");
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: record.userId, action: "auth.password_reset", resourceType: "user", resourceId: record.userId } });
    });
    return ok({ passwordUpdated: true });
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_TOKEN_ALREADY_USED") return NextResponse.json({ error: { code: "INVALID_RESET_TOKEN", message: "This reset link is invalid or has expired." } }, { status: 400 });
    return fail(error);
  }
}

export async function logout() {
  const user = await currentUser();
  if (user) await db.session.updateMany({ where: { id: user.sessionId }, data: { revokedAt: new Date() } });
  const response = ok({ loggedOut: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: sessionCookieSecure(), sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}

export async function logoutAll() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  await db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  const response = ok({ sessionsRevoked: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: sessionCookieSecure(), sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}

export async function me() {
  const user = await currentUser();
  return user ? ok({ id: user.id, email: user.email, name: user.employee?.fullName, employeeId: user.employee?.id, roles: user.roles }) : NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
}

export async function sessions() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  return ok(await db.session.findMany({ where: { userId: user.id }, select: { id: true, createdAt: true, expiresAt: true, revokedAt: true, userAgent: true, ip: true }, orderBy: { createdAt: "desc" }, take: 100 }));
}

export async function revokeSession(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const result = await db.session.updateMany({ where: { id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found." } }, { status: 404 });
  return ok({ revoked: true });
}
