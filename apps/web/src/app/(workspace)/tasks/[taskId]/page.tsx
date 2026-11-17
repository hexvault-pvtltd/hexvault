import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { canChangeTaskStatusFromPrefetchedScope, canManageTaskFromPrefetchedScope, canReadTaskFromPrefetchedScope } from "@core/features/tasks/permissions";
import { visibleEmployeeIds } from "@core/lib/scope";
import { TaskStatus } from "@/components/task-status";
import { TaskComments } from "@/components/task-comments";
import { TaskAssignees } from "@/components/task-assignees";
import { TaskDependencies } from "@/components/task-dependencies";
import { TaskReviewActions } from "@/components/task-review-actions";

export default async function TaskDetail({ params }: { params: Promise<{ taskId: string }> }) {
  const actor = await currentUser(); if (!actor) notFound();
  const { taskId } = await params;
  const task = await db.task.findUnique({ where: { id: taskId }, include: {
    project: { include: { department: { select: { name: true, headEmployeeId: true } }, memberships: { where: { employeeId: { in: actor.employee ? [actor.employee.id] : [] }, leftAt: null }, select: { employeeId: true, projectRole: true } } } },
    assignees: { where: { unassignedAt: null }, include: { employee: { select: { id: true, fullName: true, employeeCode: true } } } },
    history: { orderBy: { changedAt: "desc" }, take: 20 },
    comments: { orderBy: { createdAt: "asc" }, take: 100, include: { author: { select: { id: true, employee: { select: { fullName: true, employeeCode: true } } } } } },
    dependencies: { include: { dependsOn: { include: { project: { include: { department: { select: { headEmployeeId: true } }, memberships: { where: { employeeId: { in: actor.employee ? [actor.employee.id] : [] }, leftAt: null }, select: { employeeId: true, projectRole: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } } } },
    dependedOnBy: { include: { task: { include: { project: { include: { department: { select: { headEmployeeId: true } }, memberships: { where: { employeeId: { in: actor.employee ? [actor.employee.id] : [] }, leftAt: null }, select: { employeeId: true, projectRole: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } } } },
  } });
  const visibleTaskScope = await visibleEmployeeIds(actor);
  if (!task || !canReadTaskFromPrefetchedScope(actor, task, visibleTaskScope)) notFound();
  const canManage = canManageTaskFromPrefetchedScope(actor, task, visibleTaskScope);
  const canChangeStatus = canChangeTaskStatusFromPrefetchedScope(actor, task, visibleTaskScope);
  const canReview = canManage && !task.assignees.some(item => item.employee.id === actor.employee?.id);
  const visibleDependencies = task.dependencies.filter(item => canReadTaskFromPrefetchedScope(actor, item.dependsOn, visibleTaskScope));
  const visibleDependents = task.dependedOnBy.filter(item => canReadTaskFromPrefetchedScope(actor, item.task, visibleTaskScope));
  let people: { id: string; fullName: string; employeeCode: string }[] = [];
  let candidates: { id: string; title: string; status: string }[] = [];
  if (canManage) {
    const scope = await visibleEmployeeIds(actor);
    const isProjectManager = Boolean(task.projectId && actor.employee && (task.project?.ownerEmployeeId === actor.employee.id || task.project?.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD")));
    const projectMemberIds = isProjectManager && task.projectId ? (await db.projectMembership.findMany({ where: { projectId: task.projectId, leftAt: null }, select: { employeeId: true } })).map(item => item.employeeId) : null;
    people = await db.employee.findMany({ where: { lifecycleStatus: "ACTIVE", ...(projectMemberIds ? { id: { in: projectMemberIds } } : scope === null ? {} : { id: { in: scope } }) }, select: { id: true, fullName: true, employeeCode: true }, orderBy: { fullName: "asc" }, take: 200 });
    const candidateTasks = await db.task.findMany({ where: { projectId: task.projectId, id: { not: task.id } }, include: { project: { include: { department: { select: { headEmployeeId: true } }, memberships: { where: { employeeId: { in: actor.employee ? [actor.employee.id] : [] }, leftAt: null }, select: { employeeId: true, projectRole: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } }, orderBy: { title: "asc" }, take: 100 });
    candidates = candidateTasks.filter(item => canReadTaskFromPrefetchedScope(actor, item, visibleTaskScope)).map(item => ({ id: item.id, title: item.title, status: String(item.status) }));
  }
  return <div className="mx-auto max-w-5xl space-y-5">
    <div><p className="text-xs text-slate-400"><Link href="/tasks" className="hover:text-slate-700">Workspace / Tasks</Link> / Detail</p><div className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{task.title}</h1><p className="mt-1 text-sm text-slate-500">{task.project?.name??"General task"}{task.project?.department?.name?` · ${task.project.department.name}`:""}</p></div>{canChangeStatus?<TaskStatus id={task.id} status={task.status}/>:<span className="rounded-md bg-slate-100 px-2 py-1.5 text-[10px] text-slate-600">{task.status.replaceAll("_"," ")}</span>}</div></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.8fr)]"><div className="space-y-5">{task.status === "IN_REVIEW" && canReview && <TaskReviewActions taskId={task.id}/>}<section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Task details</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description||"No description provided."}</p><div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</p><p className="mt-1 text-xs text-slate-700">{task.priority}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Due date</p><p className="mt-1 text-xs text-slate-700">{task.dueAt?.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata"})??"Not set"}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estimate</p><p className="mt-1 text-xs text-slate-700">{task.estimatedMinutes?`${task.estimatedMinutes} minutes`:"Not set"}</p></div></div></section>
      <TaskComments taskId={task.id} initial={task.comments} actorId={actor.id} isOwner={actor.roles.includes("OWNER")}/>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Activity</h2><div className="mt-4 space-y-3">{task.history.length?task.history.map(item=><div key={item.id} className="flex gap-3 border-l-2 border-slate-200 pl-3"><div><p className="text-xs text-slate-700">{item.fromStatus?`${item.fromStatus.replaceAll("_"," ")} → `:"Created as "}{item.toStatus.replaceAll("_"," ")}{item.reason?` · ${item.reason}`:""}</p><p className="mt-1 text-[10px] text-slate-400">{item.changedAt.toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p></div></div>):<p className="text-xs text-slate-400">No status activity recorded.</p>}</div></section></div>
      <aside className="space-y-5"><TaskAssignees taskId={task.id} initial={task.assignees.map(item=>item.employee)} people={people} canManage={canManage}/><TaskDependencies taskId={task.id} initial={[...visibleDependencies.filter((item):item is NonNullable<typeof item>=>item!==null).map(item=>({id:item.id,direction:"BLOCKED_BY" as const,task:item.dependsOn})),...visibleDependents.filter((item):item is NonNullable<typeof item>=>item!==null).map(item=>({id:item.id,direction:"BLOCKS" as const,task:item.task}))]} candidates={candidates} canManage={canManage}/></aside></div>
  </div>;
}
