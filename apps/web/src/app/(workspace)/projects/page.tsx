import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { BriefcaseBusiness, Plus } from "lucide-react";

export default async function Projects() {
  const user = await currentUser();
  const visible = user ? await visibleEmployeeIds(user) : [];
  const scopedProjects = [
    { memberships: { some: { employeeId: { in: visible ?? [] }, leftAt: null } } },
    ...(user?.employee ? [{ ownerEmployeeId: user.employee.id }, { department: { headEmployeeId: user.employee.id } }] : []),
  ];
  const projects = await db.project.findMany({
    where: visible === null ? {} : { OR: scopedProjects },
    include: { department: true, _count: { select: { tasks: true, memberships: true } } },
    orderBy: { updatedAt: "desc" }, take: 100,
  });
  return <>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs text-slate-400">Operations / Projects</p><h1 className="mt-2 text-2xl font-semibold">Projects</h1><p className="mt-1 text-sm text-slate-500">Projects within your membership and department scope.</p></div>
      {user?.roles.some(role => ["OWNER", "DEPARTMENT_HEAD"].includes(role)) && <Link href="/projects/new" className="flex items-center gap-2 rounded-lg bg-[#f46327] px-4 py-2.5 text-xs font-semibold text-white"><Plus size={15}/>New project</Link>}
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.length ? projects.map(project => <Link href={`/projects/${project.id}`} key={project.id} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-violet-200 hover:shadow-sm">
        <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><BriefcaseBusiness size={18}/></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">{project.status}</span></div>
        <h2 className="mt-5 text-sm font-semibold">{project.name}</h2><p className="mt-1 text-[11px] text-slate-400">{project.code} · {project.department?.name??"Company-wide"}</p><p className="mt-3 line-clamp-2 min-h-8 text-xs leading-5 text-slate-500">{project.description??"No project description."}</p>
        <div className="mt-5 flex gap-5 border-t border-slate-100 pt-4 text-[10px] text-slate-500"><span>{project._count.tasks} tasks</span><span>{project._count.memberships} members</span><span>{project.dueDate ? `Due ${project.dueDate.toLocaleDateString()}` : "No due date"}</span></div>
      </Link>) : <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-xs text-slate-400">No projects are available in your scope.</div>}
    </div>
  </>;
}
