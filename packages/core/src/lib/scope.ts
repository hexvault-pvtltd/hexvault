import { db } from "@core/lib/db";
type Actor = { roles: string[]; employee?: { id: string; departmentId?: string | null } | null };
export async function visibleEmployeeIds(actor: Actor): Promise<string[] | null> {
  if (actor.roles.some(role => ["OWNER", "HR"].includes(role))) return null;
  if (!actor.employee) return [];
  if (actor.roles.includes("DEPARTMENT_HEAD")) {
    const people = await db.employee.findMany({ where: { department: { headEmployeeId: actor.employee.id } }, select: { id: true } });
    return people.map(person => person.id);
  }
  if (actor.roles.includes("TEAM_LEAD")) {
    const memberships = await db.teamMembership.findMany({ where: { team: { leadEmployeeId: actor.employee.id }, endedAt: null }, select: { employeeId: true } });
    return [...new Set([actor.employee.id, ...memberships.map(item => item.employeeId)])];
  }
  return [actor.employee.id];
}
