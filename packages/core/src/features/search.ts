import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";

type SearchActor = { id: string; roles: string[]; employee?: { id: string } | null };

export async function searchWorkspace(actor: SearchActor, query: string) {
  const visible = await visibleEmployeeIds(actor);
  const employeeScope = visible === null ? {} : { id: { in: visible } };
  const taskScope = visible === null ? {} : { OR: [
    { assignees: { some: { employeeId: { in: visible }, unassignedAt: null } } },
    { createdBy: actor.id },
    { project: { memberships: { some: { employeeId: { in: visible }, leftAt: null } } } },
    ...(actor.employee ? [{ project: { ownerEmployeeId: actor.employee.id } }, { project: { department: { headEmployeeId: actor.employee.id } } }] : []),
  ] };
  const projectScope = visible === null ? {} : { OR: [
    { memberships: { some: { employeeId: { in: visible }, leftAt: null } } },
    ...(actor.employee ? [{ ownerEmployeeId: actor.employee.id }, { department: { headEmployeeId: actor.employee.id } }] : []),
  ] };

  const [nameMatches, codeMatches, emailMatches, tasks, projects] = await Promise.all([
    db.employee.findMany({ where: { ...employeeScope, fullName: { contains: query, mode: "insensitive" } }, select: { id: true, employeeCode: true, fullName: true, title: true }, orderBy: { fullName: "asc" }, take: 10 }),
    db.employee.findMany({ where: { ...employeeScope, employeeCode: { contains: query, mode: "insensitive" } }, select: { id: true, employeeCode: true, fullName: true, title: true }, orderBy: { fullName: "asc" }, take: 10 }),
    db.employee.findMany({ where: { ...employeeScope, workEmail: { contains: query, mode: "insensitive" } }, select: { id: true, employeeCode: true, fullName: true, title: true }, orderBy: { fullName: "asc" }, take: 10 }),
    db.task.findMany({ where: { title: { contains: query, mode: "insensitive" }, ...taskScope }, select: { id: true, title: true, status: true }, take: 10 }),
    db.project.findMany({ where: { name: { contains: query, mode: "insensitive" }, ...projectScope }, select: { id: true, name: true, status: true }, take: 10 }),
  ]);
  const employees = [...new Map([...nameMatches, ...codeMatches, ...emailMatches].map(employee => [employee.id, employee])).values()].slice(0, 10);
  return { employees, tasks, projects };
}
