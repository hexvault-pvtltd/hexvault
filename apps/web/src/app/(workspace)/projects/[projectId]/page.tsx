import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { canManageProject, canReadProject } from "@core/features/projects/permissions";
import { canChangeTaskStatusFromPrefetchedScope, canReadTaskFromPrefetchedScope } from "@core/features/tasks/permissions";
import { ProjectMembers } from "@/components/project-members";
import { TaskStatus } from "@/components/task-status";

export default async function ProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await currentUser(); if (!actor) notFound();
  const { projectId } = await params;
  const project = await db.project.findUnique({ where: { id: projectId }, include: {
    department: { select: { id: true, name: true, headEmployeeId: true } },
    memberships: { where: { leftAt: null }, include: { employee: { select: { id: true, fullName: true, employeeCode: true, title: true } } }, orderBy: [{ projectRole: "asc" }, { joinedAt: "asc" }] },
    tasks: { orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }], take: 100, include: { assignees: { where: { unassignedAt: null }, include: { employee: { select: { fullName: true } } } } } },
  } });
  if (!project || !await canReadProject(actor, project)) notFound();
  const canManage = await canManageProject(actor, project);
  const isProjectDelegatedManager = actor.employee && (project.ownerEmployeeId === actor.employee.id || project.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD"));
  const taskVisibleEmployees = actor.roles.includes("TEAM_LEAD") ? await visibleEmployeeIds(actor) : null;
  const taskRows = project.tasks.flatMap(task => {
    const taskScope = { createdBy: task.createdBy, assignees: task.assignees, project };
    return canReadTaskFromPrefetchedScope(actor, taskScope, taskVisibleEmployees)
      ? [{ task, canChangeStatus: canChangeTaskStatusFromPrefetchedScope(actor, taskScope, taskVisibleEmployees) }]
      : [];
  });
  const visibleProjectMemberships = actor.roles.includes("TEAM_LEAD") && taskVisibleEmployees !== null
    ? project.memberships.filter(member => taskVisibleEmployees.includes(member.employeeId))
    : project.memberships;
  let candidates: { id: string; fullName: string; employeeCode: string; title: string | null }[] = [];
  if (canManage) {
    const visible = isProjectDelegatedManager ? null : await visibleEmployeeIds(actor);
    candidates = await db.employee.findMany({ where: { lifecycleStatus: "ACTIVE", ...(project.departmentId ? { departmentId: project.departmentId } : {}), ...(visible === null ? {} : { id: { in: visible } }) }, select: { id: true, fullName: true, employeeCode: true, title: true }, orderBy: { fullName: "asc" }, take: 200 });
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-xs text-slate-400"><Link href="/projects" className="hover:text-slate-700">Operations / Projects</Link> / Detail</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">{project.code}</span><h1 className="mt-1 text-2xl font-semibold">{project.name}</h1><p className="mt-1 text-sm text-slate-500">{project.department?.name??"Company-wide"} · {project.status.replaceAll("_"," ")}</p></div>{canManage&&<Link href={`/projects/${project.id}/settings`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Project settings</Link>}</div>{project.description&&<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{project.description}</p>}</div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]"><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold">Project tasks</h2><p className="mt-1 text-[11px] text-slate-400">{taskRows.length} tasks shown</p></div>{canManage&&<Link href={`/tasks/new?projectId=${project.id}`} className="rounded-lg bg-[#f46327] px-3 py-2 text-xs font-semibold text-white">Create task</Link>}</div>{taskRows.length?taskRows.map(({task,canChangeStatus})=><div key={task.id} className="grid gap-3 border-b border-slate-50 px-5 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto]"><div><Link href={`/tasks/${task.id}`} className="text-xs font-semibold text-indigo-700 hover:underline">{task.title}</Link><p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{task.assignees.filter(item=>taskVisibleEmployees===null||taskVisibleEmployees.includes(item.employeeId)).map(item=>item.employee.fullName).join(", ")||"Unassigned"}{task.dueAt?` · Due ${task.dueAt.toLocaleDateString()}`:""}</p></div>{canChangeStatus?<TaskStatus id={task.id} status={task.status}/>:<span className="self-center text-[10px] text-slate-500">{task.status.replaceAll("_"," ")}</span>}</div>):<p className="px-5 py-14 text-center text-xs text-slate-400">No tasks have been added to this project.</p>}</section>
      <ProjectMembers projectId={project.id} initial={visibleProjectMemberships} candidates={candidates} canManage={canManage}/></div>
  </div>;
}
