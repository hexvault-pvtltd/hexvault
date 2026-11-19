"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, GitBranch, Minus, Plus, Search, Users, X } from "lucide-react";
import { buildOrganization, validateReportingChange, type OrganizationNode, type OrganizationPerson, type ReportingLine } from "@core/features/organization/structure";
import "./organization-chart.css";

export function OrganizationChartView({ employees, initialRelationships, initialOutsideView, canManage, total, truncated }: { employees: OrganizationPerson[]; initialRelationships: ReportingLine[]; initialOutsideView: string[]; canManage: boolean; total: number; truncated: boolean }) {
  const [relationships, setRelationships] = useState(initialRelationships);
  const [outsideView, setOutsideView] = useState(initialOutsideView);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const [editingId, setEditingId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const graph = useMemo(() => buildOrganization(employees, relationships, outsideView), [employees, relationships, outsideView]);
  const people = useMemo(() => new Map(employees.map(person => [person.id, person])), [employees]);
  const query = search.trim().toLowerCase();
  const matches = (person: OrganizationPerson) => !query || [person.fullName, person.employeeCode, person.title ?? "", person.department?.name ?? ""].join(" ").toLowerCase().includes(query);
  const prune = (node: OrganizationNode): OrganizationNode | null => {
    const children = node.children.map(prune).filter((child): child is OrganizationNode => Boolean(child));
    return matches(node.person) || children.length ? { ...node, children } : null;
  };
  const roots = graph.roots.map(prune).filter((node): node is OrganizationNode => Boolean(node));
  const unassigned = graph.unassigned.filter(node => matches(node.person));

  function edit(id: string) {
    setEditingId(id); setManagerId(relationships.find(line => line.employeeId === id)?.supervisorEmployeeId ?? ""); setError("");
    dialog.current?.showModal();
  }
  function changeEmployee(id: string) {
    setEditingId(id); setManagerId(relationships.find(line => line.employeeId === id)?.supervisorEmployeeId ?? ""); setError("");
  }
  const canChooseManager = (id: string) => {
    try { validateReportingChange(editingId, id, relationships); return true; } catch { return false; }
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !editingId) return;
    setBusy(true); setError("");
    try {
      validateReportingChange(editingId, managerId || null, relationships);
      const response = await fetch("/api/v1/org-chart", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ employeeId: editingId, supervisorEmployeeId: managerId || null }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Could not update the reporting manager.");
      setRelationships(current => [...current.filter(line => line.employeeId !== editingId), ...(body.data.relationship ? [body.data.relationship as ReportingLine] : [])]);
      setOutsideView(current => current.filter(id => id !== editingId));
      setCollapsed(new Set());
      setMessage(`Reporting manager updated for ${people.get(editingId)?.fullName ?? "the employee"}.`);
      dialog.current?.close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save the reporting relationship."); }
    finally { setBusy(false); }
  }

  function card(node: OrganizationNode, hierarchical: boolean) {
    const person = node.person;
    const actualReports = graph.reportCounts[person.id] ?? 0;
    const expanded = Boolean(query) || !collapsed.has(person.id);
    return <article className={`oc-person ${query && matches(person) ? "oc-person-match" : ""}`}>
      <div className="oc-person-top"><span className="oc-avatar" aria-hidden="true">{person.fullName.split(/\s+/).map(word => word[0]).join("").slice(0, 2)}</span><span className="oc-employee-code">{person.employeeCode}</span></div>
      <Link className="oc-name" href={`/workforce/${person.id}`}>{person.fullName}</Link><p className="oc-job">{person.title ?? "Employee"}</p><p className="oc-department">{person.department?.name ?? "No department assigned"}</p>
      {node.issue ? <p className="oc-record-note oc-issue-note">Reporting line needs correction</p> : node.outsideView ? <p className="oc-record-note">Manager outside this view</p> : !relationships.some(line => line.employeeId === person.id) && <p className="oc-record-note">No manager recorded</p>}
      <div className="oc-person-actions">{hierarchical && node.children.length ? <button type="button" aria-label={`${expanded ? "Collapse" : "Expand"} reports of ${person.fullName}`} aria-expanded={expanded} onClick={() => setCollapsed(current => { const next = new Set(current); if (next.has(person.id)) next.delete(person.id); else next.add(person.id); return next; })}><Users size={12}/>{actualReports} reports {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button> : <span className="oc-report-count">{actualReports} direct reports</span>}{canManage && <button type="button" onClick={() => edit(person.id)}>Set manager</button>}</div>
    </article>;
  }
  function branch(node: OrganizationNode): React.ReactNode {
    const expanded = Boolean(query) || !collapsed.has(node.person.id);
    return <li key={node.person.id}>{card(node, true)}{node.children.length > 0 && expanded && <ul>{node.children.map(branch)}</ul>}</li>;
  }

  return <div className="oc-view">
    <div className="oc-summary"><span><Users size={16}/><strong>{employees.length}</strong> employees</span><span><GitBranch size={16}/><strong>{graph.connections}</strong> reporting lines</span><span><strong>{graph.managers}</strong> managers with reports</span></div>
    {message && <p role="status" className="oc-success">{message}</p>}
    {graph.issues.length > 0 && <p role="status" className="oc-warning">{graph.issues.length} employee records have conflicting or circular reporting lines. These invalid connections are excluded. {canManage ? "Use Set manager to correct them." : "Ask Owner or HR to correct them."}</p>}
    <section className="oc-panel" aria-labelledby="oc-hierarchy-title">
      <div className="oc-toolbar"><div><h2 id="oc-hierarchy-title">Reporting hierarchy</h2><p>Managers above, direct reports below. Scroll to explore wider branches.</p></div>{canManage && employees.length > 0 && <button type="button" className="oc-primary" onClick={() => edit(employees[0].id)}>Edit reporting line</button>}</div>
      <div className="oc-controls"><label className="oc-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people, roles or departments" aria-label="Search organization chart"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear chart search"><X size={14}/></button>}</label><div className="oc-zoom"><button type="button" aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(value => Math.max(50, value - 10))}><Minus size={15}/></button><button type="button" onClick={() => setZoom(100)} aria-label="Reset chart zoom">{zoom}%</button><button type="button" aria-label="Zoom in" disabled={zoom >= 130} onClick={() => setZoom(value => Math.min(130, value + 10))}><Plus size={15}/></button></div></div>
      {roots.length ? <div className="oc-chart-scroll" tabIndex={0} role="region" aria-label="Scrollable organization hierarchy"><div className="oc-forest" style={{ zoom: zoom / 100 }}>{roots.map(root => <div className="oc-tree" key={root.person.id}><ul aria-label={`Reporting branch led by ${root.person.fullName}`}>{branch(root)}</ul></div>)}</div></div> : <div className="oc-empty"><GitBranch size={30}/><h3>{query ? "No matching reporting branches" : "Build your reporting hierarchy"}</h3><p>{query ? "Matching employees without a manager appear below." : canManage ? "Choose Set manager on an employee card to connect them to their reporting manager." : "Reporting managers have not been configured for the employees in this view."}</p></div>}
    </section>
    {(unassigned.length > 0 || !employees.length) && <section className="oc-unassigned" aria-labelledby="oc-unassigned-title"><div className="oc-section-heading"><h2 id="oc-unassigned-title">Without a configured reporting line</h2><span>{unassigned.length} employees</span></div><p className="oc-section-description">These employees are shown separately until their reporting relationships are set.</p>{unassigned.length ? <div className="oc-unassigned-grid">{unassigned.map(node => <div key={node.person.id}>{card(node, false)}</div>)}</div> : <p className="oc-section-description">No active employees are visible in your scope.</p>}</section>}
    {query && !roots.length && !unassigned.length && <p role="status" className="oc-section-description">No employees match this search.</p>}
    {truncated && <p className="oc-section-description">Showing {employees.length} of {total} active employees in your scope. Managers outside these records are labeled without revealing their details.</p>}
    {canManage && <dialog ref={dialog} className="oc-dialog" onClose={() => { setEditingId(""); setError(""); }} onCancel={event => { if (busy) event.preventDefault(); }} onClick={event => { if (!busy && event.target === event.currentTarget) dialog.current?.close(); }} aria-labelledby="oc-dialog-title"><form onSubmit={save}><div className="oc-dialog-heading"><h2 id="oc-dialog-title">Set reporting manager</h2><button type="button" disabled={busy} aria-label="Close manager editor" onClick={() => dialog.current?.close()}><X size={18}/></button></div><p>Choose who this employee reports to. Previous reporting relationships are retained in history.</p><label>Employee<select value={editingId} required disabled={busy} onChange={event => changeEmployee(event.target.value)}><option value="">Choose employee</option>{employees.map(person => <option key={person.id} value={person.id}>{person.fullName} · {person.employeeCode}</option>)}</select></label><label>Reports to<select value={managerId} disabled={busy} onChange={event => setManagerId(event.target.value)}><option value="">No reporting manager</option>{employees.filter(person => person.id !== editingId).map(person => <option key={person.id} value={person.id} disabled={!canChooseManager(person.id)}>{person.fullName} · {person.title ?? person.employeeCode}</option>)}</select></label>{outsideView.includes(editingId) && <p className="oc-warning">The current manager is outside this view. Saving will replace that reporting relationship.</p>}{error && <p role="alert" className="oc-form-error">{error}</p>}<div className="oc-dialog-actions"><button type="button" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" disabled={busy || !editingId} className="oc-primary">{busy ? "Saving..." : "Save reporting line"}</button></div></form></dialog>}
  </div>;
}
