import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { NextRequest, NextResponse } from "next/server";
import { OrganizationError } from "@core/features/organization/structure";
import { syncEmployeeTeams, validateOrganizationSelection } from "@core/features/organization/selection";

const createSchema = z.object({
  employeeCode: z.string().trim().min(2).max(32),
  fullName: z.string().trim().min(2).max(120),
  workEmail: z.string().email().max(254),
  phone: z.string().trim().max(40).optional(),
  title: z.string().trim().max(120).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  teamIds: z.array(z.string().uuid()).max(50).default([]),
}).strict();

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const visible = await visibleEmployeeIds(actor);
  const rows = await db.employee.findMany({
    where: visible === null ? {} : { id: { in: visible } },
    select: { id: true, employeeCode: true, fullName: true, workEmail: true, phone: true, title: true, lifecycleStatus: true, department: { select: { id: true, name: true } }, createdAt: true },
    orderBy: { fullName: "asc" },
    take: 100,
  });
  return ok({ items: rows, total: rows.length });
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to create employees." } }, { status: 403 });
    }

    const input = createSchema.parse(await request.json());
    const email = input.workEmail.trim().toLowerCase();
    const employee = await db.$transaction(async tx => {
      await validateOrganizationSelection(tx, input.departmentId ?? null, input.teamIds);
      const person = await tx.employee.create({
        data: {
          employeeCode: input.employeeCode,
          fullName: input.fullName,
          workEmail: email,
          phone: input.phone || null,
          title: input.title || null,
          departmentId: input.departmentId ?? null,
        },
      });
      await tx.employmentPeriod.create({
        data: { employeeId: person.id, employmentType: "FULL_TIME", title: person.title, startDate: new Date(), status: "ACTIVE" },
      });
      await syncEmployeeTeams(tx, person.id, input.teamIds, actor.id);
      await tx.employeeHistory.create({
        data: { employeeId: person.id, eventType: "CREATED", actorId: actor.id, newData: { employeeCode: person.employeeCode, workEmail: person.workEmail } },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "employee.created", resourceType: "employee", resourceId: person.id } });
      return person;
    });

    return ok(employee, 201);
  } catch (error) {
    if (error instanceof OrganizationError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return fail(error);
  }
}
