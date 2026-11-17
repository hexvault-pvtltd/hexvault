import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { ChecklistCompleteButton, FinalizeOffboardingButton } from "@/components/lifecycle-actions";

export default async function OffboardingDetail({ params }: { params: Promise<{ caseId: string }> }) {
  const actor = await currentUser();
  const { caseId } = await params;
  const item = await db.offboardingCase.findUnique({ where: { id: caseId }, include: { employee: true, items: true } });
  if (!item) notFound();
  const visible = actor ? await visibleEmployeeIds(actor) : [];
  if (visible !== null && !visible.includes(item.employeeId)) notFound();
  const unfinishedTasks = await db.task.findMany({
    where: { assignees: { some: { employeeId: item.employeeId, unassignedAt: null } }, status: { notIn: ["DONE", "CANCELLED"] } },
    include: { project: { select: { id: true, name: true } } }, orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }], take: 100,
  });

  return <>
    <p className="text-xs text-slate-400"><Link href="/hr/offboarding" className="hover:text-slate-600">Offboarding</Link> / Case</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold">{item.employee.fullName}</h1><p className="mt-1 text-sm text-slate-500">{item.employee.employeeCode} · Effective {item.effectiveDate.toLocaleDateString()} · {item.status}</p></div>{item.status !== "COMPLETE" && actor?.roles.some(role => ["OWNER", "HR"].includes(role)) && <FinalizeOffboardingButton caseId={item.id} />}</div>
    <p className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">Exit reason: {item.reason}</p>
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="handover-tasks-title">
      <h2 id="handover-tasks-title" className="text-sm font-semibold">Unfinished assigned tasks</h2>
      <p className="mt-1 text-xs text-slate-500">Review and reassign this work before access is revoked.</p>
      {unfinishedTasks.length ? <div className="mt-3 divide-y divide-slate-100">{unfinishedTasks.map(task => <Link key={task.id} href={`/tasks/${task.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-[#d94e1d]"><span className="text-xs font-medium">{task.title}<span className="ml-2 font-normal text-slate-400">{task.project?.name ?? "General task"}</span></span><span className="text-[10px] text-slate-500">{task.status.replaceAll("_", " ")}{task.dueAt ? ` · Due ${task.dueAt.toLocaleDateString()}` : ""}</span></Link>)}</div> : <p className="mt-3 text-xs text-slate-500">No unfinished assigned tasks.</p>}
    </section>
    <section className="mt-5 rounded-xl border border-slate-200 bg-white" aria-label="Offboarding checklist">{item.items.map(check => <div key={check.id} className="flex items-center justify-between gap-4 border-b border-slate-50 px-5 py-4 last:border-0"><div><p className="text-xs font-medium">{check.title}</p><p className="mt-1 text-[10px] text-slate-400">{check.status}{check.completedAt ? ` · Completed ${check.completedAt.toLocaleDateString()}` : ""}</p></div>{check.status !== "COMPLETE" && item.status !== "COMPLETE" && <ChecklistCompleteButton apiPath={`/api/v1/offboarding/${caseId}/items/${check.id}/complete`} />}</div>)}</section>
  </>;
}
