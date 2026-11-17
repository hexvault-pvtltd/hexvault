import { db } from "@core/lib/db";
import { currentUser, SESSION_COOKIE, sessionCookieSecure } from "@core/lib/auth";
import { ok } from "@core/lib/http";
export async function POST() { const user = await currentUser(); if (user) await db.session.updateMany({ where: { id: user.sessionId }, data: { revokedAt: new Date() } }); const response = ok({ loggedOut: true }); response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: sessionCookieSecure(), sameSite: "strict", path: "/", maxAge: 0 }); return response; }
