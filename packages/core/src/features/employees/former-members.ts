import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";

export type FormerMemberActor = { roles: string[]; employee?: { id: string } | null };
const allowedRoles = ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"];

export class FormerMemberAccessError extends Error {
  constructor(public status: 403 | 404, message: string) { super(message); }
}

export async function listFormerMembers(actor: FormerMemberActor, limit = 50, offset = 0) {
  if (!actor.roles.some(role => allowedRoles.includes(role))) throw new FormerMemberAccessError(403, "Former member records require a management role.");
  const visible = await visibleEmployeeIds(actor);
  const where = { lifecycleStatus: "EXITED" as const, ...(visible === null ? {} : { id: { in: visible } }) };
  const [items, total] = await Promise.all([
    db.employee.findMany({ where, select: { id: true, employeeCode: true, fullName: true, title: true, department: { select: { name: true } }, periods: { where: { status: "EXITED" }, select: { endDate: true, exitReason: true }, orderBy: { endDate: "desc" }, take: 1 } }, orderBy: { fullName: "asc" }, take: limit, skip: offset }),
    db.employee.count({ where }),
  ]);
  return { items, total };
}

export async function getFormerMember(actor: FormerMemberActor, id: string) {
  if (!actor.roles.some(role => allowedRoles.includes(role))) throw new FormerMemberAccessError(403, "Former member records require a management role.");
  const visible = await visibleEmployeeIds(actor);
  if (visible !== null && !visible.includes(id)) throw new FormerMemberAccessError(404, "Former member not found.");
  const employee = await db.employee.findFirst({ where: { id, lifecycleStatus: "EXITED" }, select: { id: true, employeeCode: true, fullName: true, workEmail: true, title: true, department: { select: { name: true } }, periods: { orderBy: { startDate: "desc" } }, history: { orderBy: { createdAt: "desc" }, take: 100 } } });
  if (!employee) throw new FormerMemberAccessError(404, "Former member not found.");
  return employee;
}
