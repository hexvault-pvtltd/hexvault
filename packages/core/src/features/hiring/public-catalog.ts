import { db } from "@core/lib/db";

export function acceptingApplications(now: Date) {
  return { status: "PUBLISHED" as const, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}
export async function publicJobCatalog(database = db, now = new Date()) {
  return database.jobPosting.findMany({
    where: acceptingApplications(now),
    // Public responses contain job content only, never applications or internal
    // creator/updater information.
    select: { id: true, slug: true, title: true, department: true, location: true, employmentType: true, summary: true, description: true, aboutRole: true, responsibilities: true, requirements: true, publishedAt: true, expiresAt: true },
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }], take: 200,
  });
}
