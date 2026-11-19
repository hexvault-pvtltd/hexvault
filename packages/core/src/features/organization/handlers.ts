import { z } from "zod";
import { NextResponse } from "next/server";
import { currentUser } from "@core/lib/auth";
import { fail, ok } from "@core/lib/http";
import { organizationData, setReportingManager } from "./service";
import { OrganizationError } from "./structure";

const schema = z.object({ employeeId: z.string().uuid(), supervisorEmployeeId: z.string().uuid().nullable() }).strict();
export async function GET() {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    return ok(await organizationData(actor));
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner and HR can change reporting managers." } }, { status: 403 });
    const input = schema.parse(await request.json());
    return ok(await setReportingManager(actor, input.employeeId, input.supervisorEmployeeId));
  } catch (error) {
    if (error instanceof OrganizationError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return fail(error);
  }
}
