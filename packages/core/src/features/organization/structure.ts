export type OrganizationPerson = { id: string; fullName: string; employeeCode: string; title: string | null; department: { name: string } | null };
export type ReportingLine = { employeeId: string; supervisorEmployeeId: string };
export type OrganizationNode = { person: OrganizationPerson; children: OrganizationNode[]; outsideView: boolean; issue: boolean };

export function buildOrganization(people: OrganizationPerson[], lines: ReportingLine[], outsideView: string[] = []) {
  const byId = new Map(people.map(person => [person.id, person]));
  const parents = new Map<string, Set<string>>();
  const issues = new Set<string>();
  for (const line of lines) {
    if (!byId.has(line.employeeId) || !byId.has(line.supervisorEmployeeId)) continue;
    if (line.employeeId === line.supervisorEmployeeId) { issues.add(line.employeeId); continue; }
    if (!parents.has(line.employeeId)) parents.set(line.employeeId, new Set());
    parents.get(line.employeeId)!.add(line.supervisorEmployeeId);
  }
  const manager = new Map<string, string>();
  for (const id of outsideView) if (parents.has(id)) issues.add(id);
  for (const [id, candidates] of parents) {
    if (candidates.size === 1 && !issues.has(id)) manager.set(id, [...candidates][0]);
    else issues.add(id);
  }
  // Exclude every edge inside a cycle, rather than hiding people or inventing
  // a manager. Valid branches attached to these people remain visible.
  for (const person of people) {
    const path: string[] = [];
    const indexes = new Map<string, number>();
    let id: string | undefined = person.id;
    while (id && manager.has(id)) {
      if (indexes.has(id)) { for (const cyclic of path.slice(indexes.get(id)!)) issues.add(cyclic); break; }
      indexes.set(id, path.length); path.push(id); id = manager.get(id);
    }
  }
  for (const id of issues) manager.delete(id);
  const sorted = [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName) || a.employeeCode.localeCompare(b.employeeCode) || a.id.localeCompare(b.id));
  const nodes = new Map(sorted.map(person => [person.id, { person, children: [], outsideView: outsideView.includes(person.id), issue: issues.has(person.id) } as OrganizationNode]));
  for (const person of sorted) {
    const parent = manager.get(person.id);
    if (parent) nodes.get(parent)!.children.push(nodes.get(person.id)!);
  }
  const roots = sorted.filter(person => !manager.has(person.id)).map(person => nodes.get(person.id)!);
  return { roots: roots.filter(node => node.children.length || node.outsideView), unassigned: roots.filter(node => !node.children.length && !node.outsideView), issues: [...issues], connections: manager.size, managers: [...nodes.values()].filter(node => node.children.length).length, reportCounts: Object.fromEntries([...nodes].map(([id, node]) => [id, node.children.length])) };
}

export class OrganizationError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function validateReportingChange(employeeId: string, supervisorId: string | null, lines: ReportingLine[]) {
  if (!supervisorId) return;
  if (employeeId === supervisorId) throw new OrganizationError(422, "VALIDATION_ERROR", "An employee cannot report to themselves.");
  const parents = new Map<string, Set<string>>();
  for (const line of lines) {
    if (line.employeeId === employeeId) continue;
    if (!parents.has(line.employeeId)) parents.set(line.employeeId, new Set());
    parents.get(line.employeeId)!.add(line.supervisorEmployeeId);
  }
  const checked = new Set<string>();
  function visit(id: string, path: Set<string>) {
    if (id === employeeId) throw new OrganizationError(409, "CONFLICT", "This manager would create a circular reporting relationship.");
    if (path.has(id)) throw new OrganizationError(409, "CONFLICT", "The selected manager already belongs to a circular reporting structure. Fix that reporting line first.");
    if (checked.has(id)) return;
    const next = new Set(path); next.add(id);
    for (const parent of parents.get(id) ?? []) visit(parent, next);
    checked.add(id);
  }
  visit(supervisorId, new Set());
}
