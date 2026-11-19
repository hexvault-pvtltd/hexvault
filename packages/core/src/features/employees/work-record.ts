import type { Prisma } from "@prisma/client";
import { db } from "@core/lib/db";
import { canViewDraftReviews } from "@core/features/performance/profile-history";

export const workRecordTabs = ["tasks", "projects", "journals", "time", "goals", "reviews", "attendance", "leave", "teams"] as const;
export type WorkRecordTab = typeof workRecordTabs[number];
export type RecordActor = { id: string; roles: string[]; employee?: { id: string } | null };
export type WorkRecordItem = { id: string; title: string; status: string; date: Date | null; subtitle?: string; details: string[]; href?: string };
const size = 10;
const date = (value: Date) => value.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
const time = (value: Date) => value.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
const globalAccess = (actor: RecordActor) => actor.roles.some(role => ["OWNER", "HR"].includes(role));

export function parseWorkRecordQuery(tab?: string, page?: string) {
  const number = Number(page ?? "1");
  return { tab: workRecordTabs.includes(tab as WorkRecordTab) ? tab as WorkRecordTab : "tasks" as WorkRecordTab, page: Number.isSafeInteger(number) && number > 0 && number <= 10000 ? number : 1 };
}
export function canReadEmployeeRecord(actor: RecordActor, employeeId: string, scope: string[] | null) {
  return globalAccess(actor) || actor.employee?.id === employeeId || Boolean(scope?.includes(employeeId));
}

// Match task-detail visibility as well as employee visibility. An employee's
// historical assignment must not reveal a task the viewer can no longer read.
export function readableTaskScope(actor: RecordActor, scope: string[] | null): Prisma.TaskWhereInput {
  if (globalAccess(actor)) return {};
  const OR: Prisma.TaskWhereInput[] = [
    { createdBy: actor.id },
    { assignees: { some: { employeeId: { in: [...new Set([...(scope ?? []), ...(actor.employee ? [actor.employee.id] : [])])] }, unassignedAt: null } } },
  ];
  if (actor.employee && !actor.roles.includes("TEAM_LEAD")) OR.push({ project: { memberships: { some: { employeeId: actor.employee.id, leftAt: null } } } });
  if (actor.employee && actor.roles.includes("DEPARTMENT_HEAD")) OR.push({ project: { department: { headEmployeeId: actor.employee.id } } });
  return { OR };
}
export function readableProjectScope(actor: RecordActor, scope: string[] | null): Prisma.ProjectWhereInput {
  if (globalAccess(actor)) return {};
  const OR: Prisma.ProjectWhereInput[] = [{ memberships: { some: { employeeId: { in: [...new Set([...(scope ?? []), ...(actor.employee ? [actor.employee.id] : [])])] }, leftAt: null } } }];
  if (actor.employee) OR.push({ ownerEmployeeId: actor.employee.id });
  if (actor.employee && actor.roles.includes("DEPARTMENT_HEAD")) OR.push({ department: { headEmployeeId: actor.employee.id } });
  return { OR };
}

export async function employeeWorkRecord(actor: RecordActor, employeeId: string, scope: string[] | null, query: { tab: WorkRecordTab; page: number }, database = db) {
  if (!canReadEmployeeRecord(actor, employeeId, scope)) throw new Error("Employee is outside your scope.");
  const employee = await database.employee.findUnique({ where: { id: employeeId }, select: { userId: true } });
  if (!employee) throw new Error("Employee not found.");
  const taskAccess = readableTaskScope(actor, scope);
  const involvement: Prisma.TaskWhereInput[] = [
    { assignees: { some: { employeeId } } }, { timeEntries: { some: { employeeId } } }, { logEntries: { some: { workLog: { employeeId } } } },
  ];
  if (employee.userId) involvement.push({ createdBy: employee.userId }, { comments: { some: { authorId: employee.userId } } }, { history: { some: { actorId: employee.userId } } });
  const taskWhere: Prisma.TaskWhereInput = { AND: [{ OR: involvement }, taskAccess] };
  const projectWhere: Prisma.ProjectWhereInput = { AND: [{ OR: [{ memberships: { some: { employeeId } } }, { ownerEmployeeId: employeeId }] }, readableProjectScope(actor, scope)] };
  const timeWhere = { employeeId, task: taskAccess };
  const teamWhere: Prisma.TeamWhereInput = { OR: [{ leadEmployeeId: employeeId }, { memberships: { some: { employeeId } } }] };
  const paging = { take: size, skip: (query.page - 1) * size };

  async function entries(): Promise<{ records: WorkRecordItem[]; total: number }> {
    switch (query.tab) {
      case "goals": {
        const [items, total] = await Promise.all([
          database.employeeGoal.findMany({ where: { employeeId }, orderBy: [{ targetDate: "asc" }, { id: "desc" }], ...paging }),
          database.employeeGoal.count({ where: { employeeId } }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: item.title, status: item.status, date: item.targetDate, subtitle: item.targetDate ? "Target date" : "No target date", details: [item.description ?? "", ...(item.progressNote ? [`Progress: ${item.progressNote}`] : [])].filter(Boolean) })) };
      }
      case "reviews": {
        const where = { employeeId, ...(!canViewDraftReviews(actor.roles) ? { publicationStatus: "PUBLISHED" } : {}) };
        const [items, total] = await Promise.all([
          database.performanceReview.findMany({ where, orderBy: [{ periodEnd: "desc" }, { id: "desc" }], ...paging }),
          database.performanceReview.count({ where }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: `Review: ${date(item.periodStart)} – ${date(item.periodEnd)}`, status: item.publicationStatus, date: item.periodEnd, details: [item.summary] })) };
      }
      case "tasks": {
        const [items, total] = await Promise.all([
          database.task.findMany({ where: taskWhere, include: { project: { select: { name: true } }, assignees: { where: { employeeId }, select: { assignedAt: true, unassignedAt: true } }, history: { orderBy: { changedAt: "desc" }, take: 5, select: { fromStatus: true, toStatus: true, changedAt: true, reason: true } } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...paging }),
          database.task.count({ where: taskWhere }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: item.title, status: item.status, date: item.updatedAt, subtitle: item.project?.name ?? "General task", href: `/tasks/${item.id}`, details: [item.description ?? "", `Priority: ${item.priority}${item.dueAt ? `; due ${date(item.dueAt)}` : ""}`, ...item.assignees.map(assignment => `Assigned ${date(assignment.assignedAt)}${assignment.unassignedAt ? `; unassigned ${date(assignment.unassignedAt)}` : "; currently assigned"}`), ...item.history.map(event => `${date(event.changedAt)}: ${event.fromStatus ?? "Created"} → ${event.toStatus}${event.reason ? ` — ${event.reason}` : ""}`)].filter(Boolean) })) };
      }
      case "projects": {
        const [items, total] = await Promise.all([
          database.project.findMany({ where: projectWhere, include: { memberships: { where: { employeeId }, orderBy: { joinedAt: "desc" } } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...paging }),
          database.project.count({ where: projectWhere }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: item.name, status: item.status, date: item.updatedAt, subtitle: item.code, href: `/projects/${item.id}`, details: [item.description ?? "", ...(item.ownerEmployeeId === employeeId ? ["Project owner"] : []), ...item.memberships.map(member => `${member.projectRole}: joined ${date(member.joinedAt)}${member.leftAt ? `; left ${date(member.leftAt)}` : "; current member"}`)].filter(Boolean) })) };
      }
      case "journals": {
        const [items, total] = await Promise.all([
          database.dailyWorkLog.findMany({ where: { employeeId }, include: { entries: { include: { task: { select: { title: true } } } } }, orderBy: [{ workDate: "desc" }, { id: "desc" }], ...paging }),
          database.dailyWorkLog.count({ where: { employeeId } }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: `Work journal — ${date(item.workDate)}`, status: item.reviewStatus, date: item.workDate, details: [item.summary, ...item.entries.map(entry => `${entry.task.title}: ${entry.progressNote}${entry.minutesSpent !== null ? ` (${entry.minutesSpent} min)` : ""}`), ...(item.blockers ? [`Blockers: ${item.blockers}`] : []), ...(item.nextPlan ? [`Next steps: ${item.nextPlan}`] : [])] })) };
      }
      case "time": {
        const [items, total] = await Promise.all([
          database.taskTimeEntry.findMany({ where: timeWhere, include: { task: { select: { title: true } } }, orderBy: [{ startedAt: "desc" }, { id: "desc" }], ...paging }),
          database.taskTimeEntry.count({ where: timeWhere }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: item.task.title, status: item.endedAt ? "RECORDED" : "IN_PROGRESS", date: item.startedAt, subtitle: `${item.minutes} recorded minutes`, href: `/tasks/${item.taskId}`, details: [item.description ?? "", `Started ${date(item.startedAt)} ${time(item.startedAt)}${item.endedAt ? `; ended ${date(item.endedAt)} ${time(item.endedAt)}` : "; no end time recorded"}`].filter(Boolean) })) };
      }
      case "attendance": {
        const [items, total] = await Promise.all([
          database.attendanceSession.findMany({ where: { employeeId }, include: { breaks: { orderBy: { startedAt: "asc" } } }, orderBy: [{ workDate: "desc" }, { id: "desc" }], ...paging }),
          database.attendanceSession.count({ where: { employeeId } }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: `Attendance — ${date(item.workDate)}`, status: item.status, date: item.workDate, details: [`Checked in ${date(item.checkInAt)} ${time(item.checkInAt)}`, item.checkOutAt ? `Checked out ${date(item.checkOutAt)} ${time(item.checkOutAt)}` : "Not checked out", ...item.breaks.map(pause => `Break: ${time(pause.startedAt)} – ${pause.endedAt ? time(pause.endedAt) : "ongoing"}`)] })) };
      }
      case "leave": {
        const [items, total] = await Promise.all([
          database.leaveRequest.findMany({ where: { employeeId }, select: { id: true, status: true, createdAt: true, startDate: true, endDate: true, partialDay: true, decidedAt: true, leaveType: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...paging }),
          database.leaveRequest.count({ where: { employeeId } }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: item.leaveType.name, status: item.status, date: item.createdAt, subtitle: `${date(item.startDate)} – ${date(item.endDate)}`, details: [item.partialDay ? "Partial-day request" : "Full-day request", ...(item.decidedAt ? [`Decision recorded ${date(item.decidedAt)}`] : [])] })) };
      }
      case "teams": {
        const [items, total] = await Promise.all([
          database.team.findMany({ where: teamWhere, include: { department: { select: { name: true } }, memberships: { where: { employeeId }, orderBy: { startedAt: "desc" } } }, orderBy: [{ name: "asc" }, { id: "asc" }], ...paging }),
          database.team.count({ where: teamWhere }),
        ]);
        return { total, records: items.map(item => ({ id: item.id, title: item.name, subtitle: item.department.name, status: !item.active ? "INACTIVE_TEAM" : item.leadEmployeeId === employeeId ? "TEAM_LEAD" : item.memberships.some(member => !member.endedAt) ? "CURRENT_MEMBER" : "FORMER_MEMBER", date: item.memberships[0]?.startedAt ?? null, details: [...(item.leadEmployeeId === employeeId ? ["Current team lead"] : []), ...item.memberships.map(member => `Joined ${date(member.startedAt)}${member.endedAt ? `; left ${date(member.endedAt)}` : "; current membership"}`)] })) };
      }
    }
  }

  const [listing, assigned, completed, projectCount, journalTime, trackedTime, attendance, approvedLeave, completedGoals] = await Promise.all([
    entries(), database.task.count({ where: taskWhere }), database.task.count({ where: { AND: [taskWhere, { status: "DONE" }] } }), database.project.count({ where: projectWhere }),
    database.workLogTaskEntry.aggregate({ where: { workLog: { employeeId } }, _sum: { minutesSpent: true } }),
    database.taskTimeEntry.aggregate({ where: timeWhere, _sum: { minutes: true } }),
    database.attendanceSession.count({ where: { employeeId } }), database.leaveRequest.count({ where: { employeeId, status: "APPROVED" } }), database.employeeGoal.count({ where: { employeeId, status: "COMPLETED" } }),
  ]);
  return { ...listing, page: query.page, pageSize: size, tab: query.tab, metrics: { assigned, completed, projects: projectCount, journalMinutes: journalTime._sum.minutesSpent ?? 0, trackedMinutes: trackedTime._sum.minutes ?? 0, attendance, approvedLeave, completedGoals } };
}
