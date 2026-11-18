import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const patchSchema = z.object({ status: z.enum(["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"]) }).strict();
const canReview = (roles: string[]) => roles.some(role => ["OWNER", "HR"].includes(role));

export async function PATCH(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!canReview(actor.roles)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can review job applications." } }, { status: 403 });
  try {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const item = await db.$transaction(async tx => {
      const updated = await tx.jobApplication.update({ where: { id }, data: { status: input.status } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "job_application.status_changed", resourceType: "job_application", resourceId: id, metadata: { status: input.status } } });
      return updated;
    });
    return ok({ item });
  } catch (error) { return fail(error); }
}
