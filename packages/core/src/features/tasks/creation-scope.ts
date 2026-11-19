import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { TaskAssignmentError } from "./assignment-input";

type Actor = { id: string; roles: string[]; employee?: { id: string } | null };
export async function taskCreationScope(actor: Actor, projectId?: string) {
  const project = projectId ? await db.project.findUnique({ where: { id: projectId }, include: { department: { select: { headEmployeeId: true } }, memberships: { where: { leftAt: null }, select: { employeeId: true, projectRole: true } } } }) : null;
  if (projectId && !project) throw new TaskAssignmentError(404, "NOT_FOUND", "Project not found.");
  const projectLead = Boolean(project && actor.employee && (project.ownerEmployeeId === actor.employee.id || project.memberships.some(member => member.employeeId === actor.employee?.id && member.projectRole === "LEAD")));
  if (!actor.roles.some(role => ["OWNER", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role)) && !projectLead) throw new TaskAssignmentError(403, "FORBIDDEN", "You do not have access to create tasks.");
  if (project && !actor.roles.includes("OWNER") && !projectLead) {
    if (actor.roles.includes("DEPARTMENT_HEAD") && (!actor.employee || project.department?.headEmployeeId !== actor.employee.id)) throw new TaskAssignmentError(403, "FORBIDDEN", "Project is outside your department.");
    if (actor.roles.includes("TEAM_LEAD")) {
      const teams = actor.employee ? await db.team.findMany({ where: { leadEmployeeId: actor.employee.id, active: true }, select: { departmentId: true } }) : [];
      if (!project.departmentId || !teams.some(team => team.departmentId === project.departmentId)) throw new TaskAssignmentError(403, "FORBIDDEN", "Project is outside your team scope.");
    }
  }
  const visible = await visibleEmployeeIds(actor);
  return visible === null ? null : [...new Set([...visible, ...(projectLead ? project?.memberships.map(member => member.employeeId) ?? [] : [])])];
}

export const assignmentTeamSelect = {
  id: true, name: true, department: { select: { name: true } },
  lead: { select: { id: true, fullName: true, employeeCode: true, lifecycleStatus: true } },
  memberships: { where: { endedAt: null, employee: { lifecycleStatus: "ACTIVE" as const } }, select: { employee: { select: { id: true, fullName: true, employeeCode: true } } } },
} as const;

type Team = { lead: { id: string; fullName: string; employeeCode: string; lifecycleStatus: string } | null; memberships: { employee: { id: string; fullName: string; employeeCode: string } }[] };
export function activeTeamPeople(team: Team) {
  const people = team.memberships.map(item => item.employee);
  if (team.lead?.lifecycleStatus === "ACTIVE") people.push({ id: team.lead.id, fullName: team.lead.fullName, employeeCode: team.lead.employeeCode });
  return [...new Map(people.map(person => [person.id, person])).values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}
