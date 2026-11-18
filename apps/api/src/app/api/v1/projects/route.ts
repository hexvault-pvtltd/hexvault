import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canManageProject } from "@core/features/projects/permissions";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; employeeId: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id, employeeId } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { department: { select: { id: true, headEmployeeId: true } }, memberships: { where: { leftAt: null }, select: { employeeId: true, projectRole: true } } } });
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found." } }, { status: 404 });
  if (!await canManageProject(actor, project)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot manage project membership." } }, { status: 403 });
  try {
    const result = await db.$transaction(async tx => {
      const changed = await tx.projectMembership.updateMany({ where: { projectId: id, employeeId, leftAt: null }, data: { leftAt: new Date() } });
      if (!changed.count) return false;
      await tx.auditLog.create({ data: { actorId: actor.id, action: "project.member_removed", resourceType: "project", resourceId: id, metadata: { employeeId } } });
      return true;
    });
    return result ? ok({ projectId: id, employeeId, removed: true }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Active project membership not found." } }, { status: 404 });
  } catch (error) { return fail(error); }
}
