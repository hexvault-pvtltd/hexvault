import { notFound, redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { JobManager, type ManagedJob } from "@/components/job-manager";

export default async function JobPostingsPage() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) notFound();
  const postings = await db.jobPosting.findMany({ orderBy: [{ updatedAt: "desc" }, { title: "asc" }], take: 500 });
  const jobs: ManagedJob[] = postings.map(item => ({ ...item, publishedAt: item.publishedAt?.toISOString() ?? null, expiresAt: item.expiresAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }));
  return <div className="w-full space-y-5">
    <header><p className="text-xs text-slate-400">People / HR operations</p><h1 className="mt-2 text-2xl font-semibold">Careers and job postings</h1><p className="mt-1 text-sm text-slate-500">Create job roles, review drafts, and publish openings to the public careers page.</p></header>
    <JobManager initialJobs={jobs}/>
  </div>;
}
