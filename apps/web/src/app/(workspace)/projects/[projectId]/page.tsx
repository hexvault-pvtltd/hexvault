import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { canManageProject } from "@core/features/projects/permissions";
import { ProjectSettingsForm } from "@/components/project-settings-form";

export default async function ProjectSettings({ params }: { params: Promise<{ projectId: string }> }) {
  const actor = await currentUser(); if (!actor) notFound();
  const { projectId } = await params;
  const project = await db.project.findUnique({ where: { id: projectId }, include: { department: { select: { headEmployeeId: true } }, memberships: { where: { leftAt: null }, select: { employeeId: true, projectRole: true } } } });
  if (!project || !await canManageProject(actor, project)) notFound();
  return <div className="mx-auto max-w-3xl"><p className="text-xs text-slate-400"><Link href={`/projects/${project.id}`} className="hover:text-slate-600">{project.code}</Link> / Settings</p><h1 className="mt-2 text-2xl font-semibold">Project settings</h1><p className="mt-1 text-sm text-slate-500">Update the project details, status, and timeline.</p><ProjectSettingsForm project={{ ...project, startDate: project.startDate?.toISOString().slice(0,10)??null, dueDate: project.dueDate?.toISOString().slice(0,10)??null }}/></div>;
}
