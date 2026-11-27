import { DOCX_MIME } from "@core/features/documents/formats";
import { db } from "@core/lib/db";
import { canReadDocument } from "@core/features/documents/permissions";
import { cdnFolderAccess } from "@core/features/cdn/permissions";
import { canReadTask } from "@core/features/tasks/permissions";

type Actor = { id: string; roles: string[]; employee?: { id: string } | null };
export const previewableTypes = new Set([DOCX_MIME,"application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "video/mp4", "video/webm", "text/plain", "text/csv", "application/json"]);

export async function fileAccess(actor: Actor, fileId: string) {
  const [document, chat, cdn, attachment] = await Promise.all([
    db.employeeDocument.findFirst({ where: { OR: [{ currentFileId: fileId }, { versions: { some: { fileId } } }] } }),
    db.chatAttachment.findFirst({ where: { fileId, message: { conversation: { members: { some: { userId: actor.id, leftAt: null } } } } }, select: { messageId: true } }),
    db.cdnAsset.findUnique({ where: { fileId }, include: { folder: { select: { active: true } } } }),
    db.taskAttachment.findFirst({ where: { fileId }, include: { task: { include: { assignees: { where: { unassignedAt: null }, select: { employeeId: true } }, project: { select: { id: true, ownerEmployeeId: true, department: { select: { headEmployeeId: true } } } } } } } }),
  ]);
  const readableDocument = document && canReadDocument(actor, document) ? document : null;
  const canReadCdn = cdn?.folder.active && (cdn.isPublic || Boolean(await cdnFolderAccess(actor, cdn.folderId)));
  const canReadAttachment = attachment && await canReadTask(actor, attachment.task);
  return { allowed: Boolean(actor.roles.includes("OWNER") || readableDocument || chat || canReadCdn || canReadAttachment), document: readableDocument, chat };
}
