import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@core/lib/db";
import { createSession, SESSION_COOKIE, sessionCookieSecure } from "@core/lib/auth";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });
export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const attempts = await db.loginEvent.count({ where: { success: false, createdAt: { gte: windowStart }, OR: [{ emailAttempted: email }, { ip }] } });
    if (attempts >= 12) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." } }, { status: 429 });
    const user = await db.user.findUnique({ where: { email }, include: { employee: true } });
    const employeeCanSignIn = !user?.employee || !["SUSPENDED", "EXITED"].includes(user.employee.lifecycleStatus);
    const valid = user && user.status === "ACTIVE" && employeeCanSignIn && await compare(input.password, user.passwordHash);
    await db.loginEvent.create({ data: { userId: user?.id, emailAttempted: email, success: Boolean(valid), ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: request.headers.get("user-agent") } });
    if (!valid) return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } }, { status: 401 });
    const token = await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const response = ok({ id: user.id, email: user.email, name: user.employee?.fullName ?? user.email });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: sessionCookieSecure(), sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 14 });
    return response;
  } catch (error) { return fail(error); }
}
