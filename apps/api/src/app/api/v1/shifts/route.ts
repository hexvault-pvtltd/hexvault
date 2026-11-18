import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ name: z.string().trim().min(2).max(80), startLocalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endLocalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: z.string().min(3).max(80).default("Asia/Kolkata"), graceMinutes: z.number().int().min(0).max(180).default(0) }).strict();
const canManage = (roles: string[]) => roles.some(role => ["OWNER", "HR"].includes(role));

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const items = await db.shift.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return ok({ items, total: items.length });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!canManage(actor.roles)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage shift definitions." } }, { status: 403 });
    const input = schema.parse(await request.json());
    const shift = await db.$transaction(async tx => {
      const created = await tx.shift.create({ data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "shift.created", resourceType: "shift", resourceId: created.id } });
      return created;
    });
    return ok(shift, 201);
  } catch (error) { return fail(error); }
}
