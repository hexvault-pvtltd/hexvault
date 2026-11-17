import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const contentSchema = z.object({
  title: z.string().trim().min(3).max(120),
  department: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().min(2).max(120),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
  summary: z.string().trim().min(10).max(280),
  description: z.string().trim().min(20).max(12000),
  aboutRole: z.string().trim().max(8000).nullable().optional(),
  responsibilities: z.array(z.string().trim().min(2).max(400)).max(30),
  requirements: z.array(z.string().trim().min(2).max(400)).max(30),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).default("DRAFT"),
  expiresAt: z.coerce.date().nullable().optional(),
}).strict();
const canManage = (roles: string[]) => roles.some(role => ["OWNER", "HR"].includes(role));
function slugFromTitle(title: string) { return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || `role-${randomUUID().slice(0, 8)}`; }
function forbidden() { return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage job postings." } }, { status: 403 }); }

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!canManage(actor.roles)) return forbidden();
  try {
    const items = await db.jobPosting.findMany({ orderBy: [{ updatedAt: "desc" }, { title: "asc" }], take: 500 });
    return ok({ items, total: items.length });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!canManage(actor.roles)) return forbidden();
  try {
    const input = contentSchema.parse(await request.json());
    if (input.expiresAt && input.expiresAt <= new Date()) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Closing date must be in the future." } }, { status: 422 });
    const item = await db.$transaction(async tx => {
      const posting = await tx.jobPosting.create({ data: { ...input, department: input.department || null, aboutRole: input.aboutRole || null, slug: slugFromTitle(input.title), createdBy: actor.id, updatedBy: actor.id, publishedAt: input.status === "PUBLISHED" ? new Date() : null } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "job_posting.created", resourceType: "job_posting", resourceId: posting.id, metadata: { slug: posting.slug, status: posting.status } } });
      return posting;
    });
    return ok({ item }, 201);
  } catch (error) { return fail(error); }
}
