import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), date: z.coerce.date().optional(), departmentId: z.string().uuid().nullable().optional() }).strict();
function noAccess() { return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage holidays." } }, { status: 403 }); }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return noAccess();
    const { id } = await params; const input = schema.parse(await request.json());
    if (!Object.keys(input).length) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Provide at least one field to update." } }, { status: 422 });
    if (!await db.holiday.findUnique({ where: { id } })) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Holiday not found." } }, { status: 404 });
    const data = { ...input, ...(input.date ? { date: new Date(Date.UTC(input.date.getUTCFullYear(), input.date.getUTCMonth(), input.date.getUTCDate())) } : {}) };
    const result = await db.$transaction(async tx => { const item = await tx.holiday.update({ where: { id }, data }); await tx.auditLog.create({ data: { actorId: actor.id, action: "holiday.updated", resourceType: "holiday", resourceId: id } }); return item; });
    return ok(result);
  } catch (error) { return fail(error); }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return noAccess();
  const { id } = await params;
  if (!await db.holiday.findUnique({ where: { id } })) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Holiday not found." } }, { status: 404 });
  await db.$transaction(async tx => { await tx.holiday.delete({ where: { id } }); await tx.auditLog.create({ data: { actorId: actor.id, action: "holiday.deleted", resourceType: "holiday", resourceId: id } }); });
  return ok({ deleted: true });
}
