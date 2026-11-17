import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const createSchema = z.object({
  employeeCode: z.string().trim().min(2).max(32),
  fullName: z.string().trim().min(2).max(120),
  workEmail: z.string().email().max(254),
  phone: z.string().trim().max(40).optional(),
  title: z.string().trim().max(120).optional(),
  departmentId: z.string().uuid().optional(),
}).strict();

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
      await tx.employeeHistory.create({
        data: { employeeId: person.id, eventType: "CREATED", actorId: actor.id, newData: { employeeCode: person.employeeCode, workEmail: person.workEmail } },
      });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "employee.created", resourceType: "employee", resourceId: person.id } });
      return person;
    });

    return ok(employee, 201);
  } catch (error) {
    return fail(error);
  }
}
