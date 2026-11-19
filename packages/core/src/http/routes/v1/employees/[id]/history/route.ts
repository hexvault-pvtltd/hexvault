import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const visible = await visibleEmployeeIds(actor);
  if (visible !== null && !visible.includes(id)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Employee is outside your scope." } }, { status: 403 });
  const records = await db.employeeHistory.findMany({ where: { employeeId: id }, orderBy: { createdAt: "desc" }, take: 200 });
  return ok({ items: records, total: records.length });
}
