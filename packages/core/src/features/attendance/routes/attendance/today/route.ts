import { currentUser } from "@core/lib/auth";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
import { personalAttendance } from "@core/features/attendance/overview";

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { session } = await personalAttendance(actor.employee?.id);
  const response = ok(session);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
