import { visibleEmployeeIds } from "@core/lib/scope";

type Actor = { roles: string[]; employee?: { id: string } | null };
type ProjectScope = { ownerEmployeeId?: string | null; department?: { headEmployeeId: string | null } | null; memberships: { employeeId: string; projectRole?: string }[] };

export async function canReadProject(actor: Actor, project: ProjectScope) {
  if (actor.roles.some(role => ["OWNER", "HR"].includes(role))) return true;
  if (project.ownerEmployeeId && project.ownerEmployeeId === actor.employee?.id) return true;
  if (project.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD")) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && project.department?.headEmployeeId === actor.employee?.id) return true;
  if (actor.employee && project.memberships.some(member => member.employeeId === actor.employee?.id)) return true;
  const visible = await visibleEmployeeIds(actor);
  return visible !== null && project.memberships.some(member => visible.includes(member.employeeId));
}

export async function canManageProject(actor: Actor, project: ProjectScope) {
  if (actor.roles.includes("OWNER")) return true;
  if (project.ownerEmployeeId && project.ownerEmployeeId === actor.employee?.id) return true;
  if (actor.employee && project.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD")) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && project.department?.headEmployeeId === actor.employee?.id) return true;
  // Team Leads manage a project only when explicitly appointed as its lead;
  // membership of one of their reports must not confer project-wide control.
  return false;
}
