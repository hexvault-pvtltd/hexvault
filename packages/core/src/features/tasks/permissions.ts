import { visibleEmployeeIds } from "@core/lib/scope";
import { db } from "@core/lib/db";

type Actor = { id: string; roles: string[]; employee?: { id: string } | null };
type TaskScope = {
  createdBy: string;
  assignees: { employeeId: string }[];
  project?: { id?: string; ownerEmployeeId?: string | null; department?: { headEmployeeId: string | null } | null; memberships?: { employeeId: string; projectRole: string }[] } | null;
};

export function canReadTaskFromPrefetchedScope(actor: Actor, task: TaskScope, visibleEmployeeIds: string[] | null): boolean {
  if (actor.roles.some(role => ["OWNER", "HR"].includes(role))) return true;
  if (task.createdBy === actor.id) return true;
  const assigneeIds = task.assignees.map(item => item.employeeId);
  if (actor.employee && assigneeIds.includes(actor.employee.id)) return true;
  if (!actor.roles.includes("TEAM_LEAD") && actor.employee && task.project?.memberships?.some(item => item.employeeId === actor.employee?.id)) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && task.project?.department?.headEmployeeId === actor.employee?.id) return true;
  return visibleEmployeeIds !== null && assigneeIds.some(id => visibleEmployeeIds.includes(id));
}

export function canManageTaskFromPrefetchedScope(actor: Actor, task: TaskScope, visibleEmployeeIds: string[] | null): boolean {
  if (actor.roles.includes("OWNER")) return true;
  if (actor.employee && task.project?.ownerEmployeeId === actor.employee.id) return true;
  if (actor.employee && task.project?.memberships?.some(item => item.employeeId === actor.employee?.id && item.projectRole === "LEAD")) return true;
  if (task.createdBy === actor.id && actor.roles.some(role => ["DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && task.project?.department?.headEmployeeId === actor.employee?.id) return true;
  return actor.roles.includes("TEAM_LEAD") && visibleEmployeeIds !== null && task.assignees.some(item => visibleEmployeeIds.includes(item.employeeId));
}

export function canChangeTaskStatusFromPrefetchedScope(actor: Actor, task: TaskScope, visibleEmployeeIds: string[] | null): boolean {
  if (actor.roles.includes("OWNER")) return true;
  if (actor.employee && task.assignees.some(item => item.employeeId === actor.employee?.id)) return true;
  if (actor.employee && task.project?.ownerEmployeeId === actor.employee.id) return true;
  if (actor.employee && task.project?.memberships?.some(item => item.employeeId === actor.employee?.id && item.projectRole === "LEAD")) return true;
  if (task.createdBy === actor.id && actor.roles.some(role => ["DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && task.project?.department?.headEmployeeId === actor.employee?.id) return true;
  return actor.roles.includes("TEAM_LEAD") && visibleEmployeeIds !== null && task.assignees.some(item => visibleEmployeeIds.includes(item.employeeId));
}

export async function canReadTask(actor: Actor, task: TaskScope): Promise<boolean> {
  if (actor.roles.some(role => ["OWNER", "HR"].includes(role))) return true;
  if (task.createdBy === actor.id) return true;
  const employeeIds = task.assignees.map(item => item.employeeId);
  if (actor.employee && employeeIds.includes(actor.employee.id)) return true;
  if (!actor.roles.includes("TEAM_LEAD") && actor.employee && task.project?.id && await db.projectMembership.findFirst({ where: { projectId: task.project.id, employeeId: actor.employee.id, leftAt: null }, select: { id: true } })) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && task.project?.department?.headEmployeeId === actor.employee?.id) return true;
  const visible = await visibleEmployeeIds(actor);
  return visible !== null && employeeIds.some(id => visible.includes(id));
}

export async function canManageTask(actor: Actor, task: TaskScope): Promise<boolean> {
  if (actor.roles.includes("OWNER")) return true;
  if (actor.employee && task.project?.ownerEmployeeId === actor.employee.id) return true;
  if (actor.employee && task.project?.id && await db.projectMembership.findFirst({ where: { projectId: task.project.id, employeeId: actor.employee.id, projectRole: "LEAD", leftAt: null }, select: { id: true } })) return true;
  if (task.createdBy === actor.id && actor.roles.some(role => ["DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) return true;
  if (actor.roles.includes("DEPARTMENT_HEAD") && task.project?.department?.headEmployeeId === actor.employee?.id) return true;
  if (!actor.roles.includes("TEAM_LEAD")) return false;
  const visible = await visibleEmployeeIds(actor);
  return visible !== null && task.assignees.some(item => visible.includes(item.employeeId));
}

export async function canAssignTaskTo(actor: Actor, employeeId: string, task?: TaskScope): Promise<boolean> {
  if (actor.roles.includes("OWNER")) return true;
  if (actor.roles.some(role => ["DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) {
    const visible = await visibleEmployeeIds(actor);
    if (visible === null || visible.includes(employeeId)) return true;
  }
  if (actor.employee && task?.project?.id && (task.project.ownerEmployeeId === actor.employee.id || await db.projectMembership.findFirst({ where: { projectId: task.project.id, employeeId: actor.employee.id, projectRole: "LEAD", leftAt: null }, select: { id: true } }))) {
    return Boolean(await db.projectMembership.findFirst({ where: { projectId: task.project.id, employeeId, leftAt: null }, select: { id: true } }));
  }
  return false;
}

export async function canChangeTaskStatus(actor: Actor, task: TaskScope): Promise<boolean> {
  if (actor.roles.includes("OWNER")) return true;
  if (actor.employee && task.assignees.some(item => item.employeeId === actor.employee?.id)) return true;
  return canManageTask(actor, task);
}
