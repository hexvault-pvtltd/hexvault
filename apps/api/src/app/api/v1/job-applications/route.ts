import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const querySchema = z.object({
  status: z.enum(["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"]).optional(),
  jobId: z.uuid().optional(),
}).strict();
const canReview = (roles: string[]) => roles.some(role => ["OWNER", "HR"].includes(role));

export async function GET(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!canReview(actor.roles)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can review job applications." } }, { status: 403 });
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const items = await db.jobApplication.findMany({
      where: { ...(query.status ? { status: query.status } : {}), ...(query.jobId ? { jobPostingId: query.jobId } : {}) },
      include: { jobPosting: { select: { id: true, title: true, slug: true, status: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return ok({ items, total: items.length });
  } catch (error) { return fail(error); }
}
