import { db } from "@core/lib/db";

export type CdnActor = { id: string; roles: string[] };
export type CdnAccess = { canView: boolean; canUpload: boolean; canManage: boolean };

const OWNER_ACCESS: CdnAccess = { canView: true, canUpload: true, canManage: true };

export async function cdnFolderAccess(actor: CdnActor, folderId: string): Promise<CdnAccess | null> {
  if (actor.roles.includes("OWNER")) return OWNER_ACCESS;
  const grant = await db.cdnFolderGrant.findUnique({
    where: { folderId_userId: { folderId, userId: actor.id } },
    select: { canView: true, canUpload: true, canManage: true },
  });
  return grant?.canView ? grant : null;
}

export async function canUploadToCdnFolder(actor: CdnActor, folderId: string) {
  const access = await cdnFolderAccess(actor, folderId);
  return Boolean(access && (access.canUpload || access.canManage));
}

export async function canManageCdnFolderFiles(actor: CdnActor, folderId: string) {
  const access = await cdnFolderAccess(actor, folderId);
  return Boolean(access?.canManage);
}
