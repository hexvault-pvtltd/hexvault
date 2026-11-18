import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";

export async function GET() {
  try {
    const now = new Date();
    const items = await db.jobPosting.findMany({ where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true, slug: true, title: true, department: true, location: true, employmentType: true, summary: true, description: true, aboutRole: true, responsibilities: true, requirements: true, publishedAt: true, expiresAt: true }, orderBy: [{ publishedAt: "desc" }, { title: "asc" }], take: 200 });
    return ok({ items });
  } catch (error) { return fail(error); }
}
