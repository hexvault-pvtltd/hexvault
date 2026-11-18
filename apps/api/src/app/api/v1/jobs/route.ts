import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const patchSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(), department: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().min(2).max(120).optional(), employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]).optional(),
  summary: z.string().trim().min(10).max(280).optional(), description: z.string().trim().min(20).max(12000).optional(),
  aboutRole: z.string().trim().max(8000).nullable().optional(), responsibilities: z.array(z.string().trim().min(2).max(400)).max(30).optional(),
  requirements: z.array(z.string().trim().min(2).max(400)).max(30).optional(), status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Provide at least one field to update.");
const canManage = (roles: string[]) => roles.some(role => ["OWNER", "HR"].includes(role));
function slugFromTitle(title: string) { return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "open-role"; }

export async function GET(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!canManage(actor.roles)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage job postings." } }, { status: 403 });
  try { const { id } = await params; const item = await db.jobPosting.findUnique({ where: { id } }); return item ? ok({ item }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Job posting not found." } }, { status: 404 }); }
  catch (error) { return fail(error); }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!canManage(actor.roles)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only Owner or HR can manage job postings." } }, { status: 403 });
  try {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const existing = await db.jobPosting.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Job posting not found." } }, { status: 404 });
    if (input.expiresAt && input.expiresAt <= new Date()) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Closing date must be in the future." } }, { status: 422 });
    const status = input.status ?? existing.status;
    const item = await db.$transaction(async tx => {
      const updated = await tx.jobPosting.update({ where: { id }, data: { ...input, ...(input.department !== undefined ? { department: input.department || null } : {}), ...(input.aboutRole !== undefined ? { aboutRole: input.aboutRole || null } : {}), ...(input.title && input.title !== existing.title ? { slug: slugFromTitle(input.title) } : {}), ...(status === "PUBLISHED" && existing.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}), updatedBy: actor.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "job_posting.updated", resourceType: "job_posting", resourceId: id, metadata: { status: updated.status, slug: updated.slug } } });
      return updated;
    });
    return ok({ item });
  } catch (error) { return fail(error); }
}
