import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { OrganizationError, validateReportingChange } from "./structure";

type Actor = { id: string; roles: string[]; employee?: { id: string } | null };
export async function organizationData(actor: Actor) {
  const visible = await visibleEmployeeIds(actor);
  const where = { ...(visible === null ? {} : { id: { in: visible } }), lifecycleStatus: "ACTIVE" as const };
  const [employees, total] = await Promise.all([
    db.employee.findMany({ where, select: { id: true, fullName: true, employeeCode: true, title: true, department: { select: { id: true, name: true } } }, orderBy: [{ fullName: "asc" }, { id: "asc" }], take: 500 }),
    db.employee.count({ where }),
  ]);
  const ids = new Set(employees.map(person => person.id));
  const lines = employees.length ? await db.reportingRelationship.findMany({ where: { endedAt: null, employeeId: { in: [...ids] } }, select: { employeeId: true, supervisorEmployeeId: true } }) : [];
  return { employees, relationships: lines.filter(line => ids.has(line.supervisorEmployeeId)), outsideView: [...new Set(lines.filter(line => !ids.has(line.supervisorEmployeeId)).map(line => line.employeeId))], truncated: total > employees.length, total };
}

export async function setReportingManager(actor: Actor, employeeId: string, supervisorEmployeeId: string | null, database = db) {
  if (!actor.roles.some(role => ["OWNER", "HR"].includes(role))) throw new OrganizationError(403, "FORBIDDEN", "Only Owner and HR can change reporting managers.");
  return database.$transaction(async tx => {
    // Serialize reporting changes so concurrent A→B and B→A requests cannot
    // independently pass cycle validation and commit a cycle together.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"organization-reporting"}))`;
    const ids = [...new Set([employeeId, ...(supervisorEmployeeId ? [supervisorEmployeeId] : [])])];
    const active = await tx.employee.count({ where: { id: { in: ids }, lifecycleStatus: "ACTIVE" } });
    if (active !== ids.length) throw new OrganizationError(404, "NOT_FOUND", "Select active employees for the reporting relationship.");
    const current = await tx.reportingRelationship.findMany({ where: { endedAt: null }, select: { id: true, employeeId: true, supervisorEmployeeId: true } });
    validateReportingChange(employeeId, supervisorEmployeeId, current);
    const previous = current.filter(line => line.employeeId === employeeId);
    if ((previous.length === 1 && previous[0].supervisorEmployeeId === supervisorEmployeeId) || (!previous.length && !supervisorEmployeeId)) return { relationship: previous[0] ?? null };
    await tx.reportingRelationship.updateMany({ where: { employeeId, endedAt: null }, data: { endedAt: new Date() } });
    const relationship = supervisorEmployeeId ? await tx.reportingRelationship.create({ data: { employeeId, supervisorEmployeeId }, select: { id: true, employeeId: true, supervisorEmployeeId: true } }) : null;
    await tx.employeeHistory.create({ data: { employeeId, actorId: actor.id, eventType: "REPORTING_MANAGER_CHANGED", oldData: { supervisorEmployeeIds: previous.map(line => line.supervisorEmployeeId) }, newData: { supervisorEmployeeId, reason: supervisorEmployeeId ? "Reporting manager assigned." : "Reporting manager removed." } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "organization.manager_changed", resourceType: "employee", resourceId: employeeId, metadata: { supervisorEmployeeId } } });
    return { relationship };
  });
}
