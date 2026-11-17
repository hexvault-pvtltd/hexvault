import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";

export default async function OrganizationChart() {
  const actor = await currentUser();
  if (!actor) notFound();
  const visible = await visibleEmployeeIds(actor);
  const scope = visible === null ? {} : { id: { in: visible } };
  const [employees, relationships] = await Promise.all([
    db.employee.findMany({ where: { ...scope, lifecycleStatus: "ACTIVE" }, select: { id: true, fullName: true, employeeCode: true, title: true, department: { select: { name: true } } }, orderBy: { fullName: "asc" }, take: 500 }),
    db.reportingRelationship.findMany({ where: { endedAt: null, employee: scope, supervisor: scope }, select: { employeeId: true, supervisorEmployeeId: true } }),
  ]);
  const people = new Map(employees.map(employee => [employee.id, employee]));
  const managers = new Map(relationships.map(item => [item.employeeId, item.supervisorEmployeeId]));
  const roots = employees.filter(employee => !people.has(managers.get(employee.id) ?? ""));
  const listed = new Set<string>();
  const render = (employeeId: string, depth = 0): React.ReactNode => {
    if (listed.has(employeeId)) return null;
    const employee = people.get(employeeId);
    if (!employee) return null;
    listed.add(employeeId);
    const children = employees.filter(candidate => managers.get(candidate.id) === employeeId);
    return <li key={employee.id} className="py-1" role="treeitem" aria-selected={false} aria-expanded={children.length > 0}><div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#ececea] bg-white px-4 py-3" style={{ marginInlineStart: `${Math.min(depth, 12) * 20}px` }}><Link href={`/workforce/${employee.id}`} className="text-xs font-semibold hover:text-[#d94e1d]">{employee.fullName}</Link><span className="text-[10px] text-slate-400">{employee.employeeCode}</span><span className="text-[10px] text-slate-500">{employee.title ?? "Employee"}</span><span className="text-[10px] text-slate-400">{employee.department?.name ?? "Unassigned"}</span></div>{children.length > 0 && <ul role="group" className="mt-1">{children.map(child => render(child.id, depth + 1))}</ul>}</li>;
  };
  const tree = roots.map(person => render(person.id));
  const disconnected = employees.filter(person => !listed.has(person.id)).map(person => render(person.id));
  return <div className="mx-auto w-full max-w-5xl"><div className="mb-6"><p className="text-xs text-slate-400">People · Organization</p><h1 className="mt-2 text-2xl font-semibold">Organization chart</h1><p className="mt-1 text-sm text-slate-500">Active reporting relationships in your authorized employee scope.</p></div>{employees.length ? <ul role="tree" aria-label="Organization reporting structure" className="space-y-2">{tree}{disconnected}</ul> : <p className="rounded-[18px] border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-xs text-slate-500">No active employees are visible in your scope.</p>}{employees.length === 500 && <p className="mt-3 text-[10px] text-slate-400">Showing the first 500 active employees.</p>}</div>;
}
