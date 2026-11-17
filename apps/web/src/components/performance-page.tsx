import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { PerformanceWorkbench } from "@/components/performance-workbench";

const managerRoles = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];

export async function PerformancePage({ section }: { section: "all" | "reviews" | "goals" }) {
  const actor = await currentUser();
  if (!actor) notFound();
  const canManage = actor.roles.some(role => managerRoles.includes(role));
  if (!canManage && !actor.employee) notFound();
  const visible = await visibleEmployeeIds(actor);
  const recordScope = visible === null ? {} : { employeeId: { in: visible } };
  const employeeScope = visible === null ? {} : { id: { in: visible } };
  const reviewWhere = { ...recordScope, ...(!canManage ? { publicationStatus: "PUBLISHED" } : {}) };
  const [reviews, goals, people] = await Promise.all([
    section === "goals" ? Promise.resolve([]) : db.performanceReview.findMany({ where: reviewWhere, orderBy: [{ periodEnd: "desc" }, { id: "desc" }], take: 100 }),
    section === "reviews" ? Promise.resolve([]) : db.employeeGoal.findMany({ where: recordScope, orderBy: [{ targetDate: "asc" }, { id: "asc" }], take: 100 }),
    canManage ? db.employee.findMany({ where: { ...employeeScope, lifecycleStatus: "ACTIVE" }, select: { id: true, fullName: true, employeeCode: true }, orderBy: { fullName: "asc" }, take: 500 }) : actor.employee ? db.employee.findMany({ where: { id: actor.employee.id }, select: { id: true, fullName: true, employeeCode: true } }) : Promise.resolve([]),
  ]);
  const title = section === "reviews" ? "Performance reviews" : section === "goals" ? "Employee goals" : "Performance";
  return <div className="mx-auto w-full max-w-5xl"><header className="mb-5"><p className="text-xs text-slate-400">People · Development</p><h1 className="mt-2 text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-500">Reviews and goals stay visible according to your employee scope.</p></header><nav aria-label="Performance sections" className="mb-4 flex flex-wrap gap-2"><Link href="/performance" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs">Overview</Link><Link href="/performance/reviews" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs">Reviews</Link><Link href="/performance/goals" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs">Goals</Link></nav><PerformanceWorkbench reviews={reviews.map(item => ({ ...item, periodStart: item.periodStart.toISOString(), periodEnd: item.periodEnd.toISOString() }))} goals={goals.map(item => ({ ...item, targetDate: item.targetDate?.toISOString() ?? null }))} people={people} ownEmployeeId={actor.employee?.id ?? null} canManage={canManage} section={section}/></div>;
}
