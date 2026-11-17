import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextResponse } from "next/server";

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const visible = await visibleEmployeeIds(actor);
  const items = await db.department.findMany({
    where: visible === null ? {} : { OR: [{ employees: { some: { id: { in: visible } } } }, { headEmployeeId: actor.employee?.id }] },
    include: { head: { select: { id: true, fullName: true } }, _count: { select: { employees: true, teams: true } } },
    orderBy: { name: "asc" },
  });
  return ok({ items, total: items.length });
}
