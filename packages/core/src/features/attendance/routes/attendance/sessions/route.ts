import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { netWorkMinutes } from "@core/lib/domain";
import { ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";

const querySchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), mine: z.enum(["true", "false"]).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).refine(value => !value.from || !value.to || value.from <= value.to, "Start date must be before end date.");

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid attendance date range." } }, { status: 422 });
  const visible = await visibleEmployeeIds(user);
  const { from, to, limit, mine } = query.data;
  const where = { ...(mine === "true" ? { employeeId: { in: user.employee ? [user.employee.id] : [] } } : visible === null ? {} : { employeeId: { in: visible } }), ...(from || to ? { workDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) };
  const [sessions, total] = await Promise.all([db.attendanceSession.findMany({
    where,
    include: { employee: { select: { id: true, employeeCode: true, fullName: true } }, breaks: true },
    orderBy: [{ workDate: "desc" }, { checkInAt: "desc" }, { id: "desc" }], take: limit,
  }), db.attendanceSession.count({ where })]);
  const asOf = new Date();
  const items = sessions.map(session => ({
    ...session,
    workedMinutes: netWorkMinutes(session.checkInAt, session.checkOutAt ?? asOf, session.breaks.map(item => ({ start: item.startedAt, end: item.endedAt ?? asOf }))),
  }));
  return ok({ items, total });
}
