import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const schema = z.object({ name: z.string().trim().min(2).max(120), date: z.coerce.date(), departmentId: z.string().uuid().nullable().optional() }).strict();
const canManage = (roles: string[]) => roles.some(role => ["OWNER", "HR"].includes(role));
export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const items = await db.holiday.findMany({ orderBy: [{ date: "asc" }, { name: "asc" }], take: 500 });
  return ok({ items, total: items.length });
}
export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!canManage(actor.roles)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage holidays." } }, { status: 403 });
    const input = schema.parse(await request.json());
    const date = new Date(Date.UTC(input.date.getUTCFullYear(), input.date.getUTCMonth(), input.date.getUTCDate()));
    const holiday = await db.$transaction(async tx => {
      const lockKey = `${date.toISOString()}:${input.departmentId ?? "company"}:${input.name.toLocaleLowerCase()}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const duplicate = await tx.holiday.findFirst({ where: { name: { equals: input.name, mode: "insensitive" }, date, departmentId: input.departmentId ?? null } });
      if (duplicate) throw new Error("HOLIDAY_EXISTS");
      const item = await tx.holiday.create({ data: { ...input, date, departmentId: input.departmentId ?? null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "holiday.created", resourceType: "holiday", resourceId: item.id } });
      return item;
    });
    return ok(holiday, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "HOLIDAY_EXISTS") return NextResponse.json({ error: { code: "CONFLICT", message: "This holiday already exists for that date and scope." } }, { status: 409 });
    return fail(error);
  }
}
