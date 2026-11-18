import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { TaskStatus } from "@/components/task-status";
import { canChangeTaskStatusFromPrefetchedScope } from "@core/features/tasks/permissions";
import { visibleEmployeeIds } from "@core/lib/scope";

export default async function Tasks() {
  const user = await currentUser();
  if (!user) return null;
  const visible = await visibleEmployeeIds(user);
  const where = visible === null ? {} : { OR: [
    { assignees: { some: { employeeId: { in: visible }, unassignedAt: null } } },
    { createdBy: user.id },
    { project: { memberships: { some: { employeeId: { in: visible }, leftAt: null } } } },
    ...(user.employee ? [{ project: { department: { headEmployeeId: user.employee.id } } }] : []),
  ] };
  const tasks = await db.task.findMany({ where, include: {
    project: { include: { department: { select: { headEmployeeId: true } }, memberships: { where: { employeeId: { in: user.employee ? [user.employee.id] : [] }, leftAt: null }, select: { employeeId: true, projectRole: true } } } },
    assignees: { where: { unassignedAt: null }, include: { employee: { select: { id: true, fullName: true } } } },
  }, orderBy: { updatedAt: "desc" }, take: 100 });
  const rows = tasks.map(task => ({ task, canChangeStatus: canChangeTaskStatusFromPrefetchedScope(user, task, visible) }));
  const canCreate = user.roles.some(role => ["OWNER", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role));
  return <>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs text-slate-400">Workspace / Tasks</p><h1 className="mt-2 text-2xl font-semibold">Tasks</h1><p className="mt-1 text-sm text-slate-500">Assigned work and progress, independent of attendance.</p></div>{canCreate&&<Link href="/tasks/new" className="rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white">+ Create task</Link>}</div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid grid-cols-[1.4fr_1fr_.75fr_.7fr] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span>Task</span><span>Project / assignees</span><span>Priority</span><span>Status</span></div>
      {rows.length ? rows.map(({ task, canChangeStatus }) => <div key={task.id} className="grid grid-cols-[1.4fr_1fr_.75fr_.7fr] items-center gap-3 border-b border-slate-50 px-5 py-4 last:border-0"><div><Link href={`/tasks/${task.id}`} className="text-xs font-semibold text-indigo-700 hover:underline">{task.title}</Link><p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{task.description??task.project?.name??"No details"}</p></div><div><p className="text-xs text-slate-600">{task.project?.name??"General"}</p><p className="mt-1 text-[10px] text-slate-400">{task.assignees.map(assignee=>assignee.employee.fullName).join(", ")||"Unassigned"}</p></div><span className="text-[11px] text-slate-600">{task.priority}</span>{canChangeStatus?<TaskStatus id={task.id} status={task.status}/>:<span className="text-[10px] text-slate-500">{task.status.replaceAll("_"," ")}</span>}</div>) : <p className="px-5 py-14 text-center text-xs text-slate-400">No tasks are available in your scope.</p>}
    </div>
  </>;
}
