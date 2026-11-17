import { currentUser } from "@core/lib/auth";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function GET() { const user = await currentUser(); return user ? ok({ id: user.id, email: user.email, name: user.employee?.fullName, employeeId: user.employee?.id, roles: user.roles }) : NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 }); }
