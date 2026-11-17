import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@core/lib/db";

export const SESSION_COOKIE = "hv_session";
// Production deployments are served over HTTPS. Do not make cookie security
// depend on APP_URL being configured in every Vercel environment.
export function sessionCookieSecure() { return process.env.NODE_ENV === "production"; }
export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { include: { roles: { where: { revokedAt: null }, include: { role: true } }, employee: true } } } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;
  // Account status is the primary switch, but lifecycle status is also enforced
  // here so a stale user status can never keep a suspended/former employee in.
  if (session.user.employee && ["SUSPENDED", "EXITED"].includes(session.user.employee.lifecycleStatus)) return null;
  return { ...session.user, roles: session.user.roles.map((r) => r.role.code), sessionId: session.id };
}
export async function requireRole(...roles: string[]) {
  const user = await currentUser();
  if (!user) throw new AuthError(401, "UNAUTHENTICATED", "Sign in to continue.");
  if (!roles.some((role) => user.roles.includes(role as never))) throw new AuthError(403, "FORBIDDEN", "You do not have access to this resource.");
  return user;
}
export class AuthError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: h.get("user-agent") } });
  return token;
}
