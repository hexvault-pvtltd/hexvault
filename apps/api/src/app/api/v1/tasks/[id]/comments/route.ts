import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { canReadTask } from "@core/features/tasks/permissions";
import { NextResponse } from "next/server";

const schema = z.object({ body: z.string().trim().min(1).max(5000) }).strict();
async function edit(request: Request, params: Promise<{ id: string; commentId: string }>, remove: boolean) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const { id, commentId } = await params;
    const task = await db.task.findUnique({ where: { id }, include: { project: { include: { department: { select: { headEmployeeId: true } } } }, assignees: { where: { unassignedAt: null }, select: { employeeId: true } } } });
    if (!task) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task not found." } }, { status: 404 });
    if (!await canReadTask(actor, task)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Task is outside your scope." } }, { status: 403 });
    const comment = await db.taskComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.taskId !== id) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Task comment not found." } }, { status: 404 });
    if (comment.authorId !== actor.id && !actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You can only edit or delete your own comments." } }, { status: 403 });
    if (remove) {
      await db.$transaction(async tx => {
        await tx.taskComment.delete({ where: { id: commentId } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "task.comment_deleted", resourceType: "task", resourceId: id } });
      });
      return ok({ id: commentId, deleted: true });
    }
    const input = schema.parse(await request.json());
    const result = await db.$transaction(async tx => {
      const updated = await tx.taskComment.update({ where: { id: commentId }, data: { body: input.body, editedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "task.comment_edited", resourceType: "task", resourceId: id } });
      return updated;
    });
    return ok(result);
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) { return edit(request, context.params, false); }
export async function DELETE(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) { return edit(request, context.params, true); }
