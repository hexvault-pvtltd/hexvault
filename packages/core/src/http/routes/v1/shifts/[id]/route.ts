import { z } from "zod";
import { shiftTimeZone } from "@core/features/attendance/shift-input";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ name: z.string().trim().min(2).max(80).optional(), startLocalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), endLocalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(), timezone: shiftTimeZone.optional(), graceMinutes: z.number().int().min(0).max(180).optional(), active: z.boolean().optional() }).strict();
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params; const shift = await db.shift.findUnique({ where: { id } });
  return shift ? ok(shift) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Shift not found." } }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage shift definitions." } }, { status: 403 });
    const { id } = await params; const input = schema.parse(await request.json());
    if (!Object.keys(input).length) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Provide at least one shift field to update." } }, { status: 422 });
    const current = await db.shift.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Shift not found." } }, { status: 404 });
    const updated = await db.$transaction(async tx => {
      const item = await tx.shift.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "shift.updated", resourceType: "shift", resourceId: id } });
      return item;
    });
    return ok(updated);
  } catch (error) { return fail(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage shift definitions." } }, { status: 403 });
  const { id } = await params;
  const shift = await db.shift.findUnique({ where: { id } });
  if (!shift) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Shift not found." } }, { status: 404 });
  const item = await db.$transaction(async tx => {
    const disabled = await tx.shift.update({ where: { id }, data: { active: false } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "shift.deactivated", resourceType: "shift", resourceId: id } });
    return disabled;
  });
  return ok(item);
}
