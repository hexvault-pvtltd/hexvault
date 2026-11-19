import type { Prisma } from "@prisma/client";
import { OrganizationError } from "./structure";

export function validateTeamSelection(departmentId: string | null, teamIds: string[], teams: { id: string; departmentId: string; active: boolean }[], existing: { departmentId?: string | null; teamIds?: string[] } = {}) {
  if (new Set(teamIds).size !== teamIds.length) throw new OrganizationError(422, "VALIDATION_ERROR", "Select each team only once.");
  if (teamIds.length && !departmentId) throw new OrganizationError(422, "VALIDATION_ERROR", "Choose a department before selecting teams.");
  for (const id of teamIds) {
    const team = teams.find(item => item.id === id);
    if (!team) throw new OrganizationError(404, "NOT_FOUND", "A selected team no longer exists.");
    if (team.departmentId !== departmentId) throw new OrganizationError(422, "VALIDATION_ERROR", "Every selected team must belong to the selected department.");
    if (!team.active && !existing.teamIds?.includes(id)) throw new OrganizationError(409, "CONFLICT", "New members cannot be added to an inactive team.");
  }
}
export async function validateOrganizationSelection(tx: Prisma.TransactionClient, departmentId: string | null, teamIds: string[], existing: { departmentId?: string | null; teamIds?: string[] } = {}) {
  if (departmentId) {
    const department = await tx.department.findUnique({ where: { id: departmentId }, select: { id: true, active: true } });
    if (!department) throw new OrganizationError(404, "NOT_FOUND", "Department not found.");
    if (!department.active && existing.departmentId !== departmentId) throw new OrganizationError(409, "CONFLICT", "Choose an active department.");
  }
  const teams = teamIds.length ? await tx.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, departmentId: true, active: true } }) : [];
  validateTeamSelection(departmentId, teamIds, teams, existing);
}

export async function syncEmployeeTeams(tx: Prisma.TransactionClient, employeeId: string, teamIds: string[], actorId: string) {
  const current = await tx.teamMembership.findMany({ where: { employeeId, endedAt: null }, select: { teamId: true } });
  const previous = [...new Set(current.map(item => item.teamId))];
  const added = teamIds.filter(id => !previous.includes(id));
  const removed = previous.filter(id => !teamIds.includes(id));
  if (!added.length && !removed.length) return;
  if (removed.length) await tx.teamMembership.updateMany({ where: { employeeId, endedAt: null, teamId: { in: removed } }, data: { endedAt: new Date() } });
  if (added.length) await tx.teamMembership.createMany({ data: added.map(teamId => ({ employeeId, teamId })) });
  await tx.employeeHistory.create({ data: { employeeId, actorId, eventType: "TEAM_MEMBERSHIP_UPDATED", oldData: { teamIds: previous }, newData: { teamIds, reason: `Team membership updated: ${added.length} added, ${removed.length} removed.` } } });
}

export async function projectTeamEmployeeIds(tx: Prisma.TransactionClient, departmentId: string | null, teamIds: string[]) {
  await validateOrganizationSelection(tx, departmentId, teamIds);
  if (!teamIds.length) return [];
  const person = { id: true, departmentId: true, lifecycleStatus: true } as const;
  const teams = await tx.team.findMany({ where: { id: { in: teamIds } }, select: { lead: { select: person }, memberships: { where: { endedAt: null, employee: { lifecycleStatus: "ACTIVE" } }, select: { employee: { select: person } } } } });
  const people = teams.flatMap(team => [...team.memberships.map(item => item.employee), ...(team.lead?.lifecycleStatus === "ACTIVE" ? [team.lead] : [])]);
  if (people.some(employee => employee.departmentId !== departmentId)) throw new OrganizationError(409, "CONFLICT", "A selected team contains members from another department. Correct its membership first.");
  return [...new Set(people.map(employee => employee.id))];
}
