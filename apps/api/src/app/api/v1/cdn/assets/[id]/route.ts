import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { canManageCdnFolderFiles } from "@core/features/cdn/permissions";
import { deletePrivateObject } from "@core/lib/storage";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({ isPublic: z.boolean() }).strict();

export async function PATCH(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const asset = await db.cdnAsset.findUnique({ where: { id }, include: { file: { select: { scanStatus: true } }, folder: { select: { active: true } } } });
    if (!asset || !asset.folder.active) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN file not found." } }, { status: 404 });
    if (!await canManageCdnFolderFiles(actor, asset.folderId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot change sharing for this CDN file." } }, { status: 403 });
    if (input.isPublic && asset.file.scanStatus !== "CLEAN") return NextResponse.json({ error: { code: "CONFLICT", message: "Only a clean, scanned file can be made public." } }, { status: 409 });
    const updated = await db.cdnAsset.update({ where: { id }, data: { isPublic: input.isPublic } });
    await db.auditLog.create({ data: { actorId: actor.id, action: input.isPublic ? "cdn.file_published" : "cdn.file_unpublished", resourceType: "cdn_asset", resourceId: id } });
    return ok({ item: updated });
  } catch (error) { return fail(error); }
}

export async function DELETE(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id } = await params;
    const asset = await db.cdnAsset.findUnique({ where: { id }, include: { file: true, folder: { select: { active: true } } } });
    if (!asset || !asset.folder.active) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN file not found." } }, { status: 404 });
    if (!await canManageCdnFolderFiles(actor, asset.folderId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You cannot delete files from this CDN folder." } }, { status: 403 });
    await deletePrivateObject(asset.file.storageKey);
    await db.$transaction(async tx => {
      await tx.cdnAsset.delete({ where: { id } });
      await tx.file.delete({ where: { id: asset.file.id } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "cdn.file_deleted", resourceType: "cdn_asset", resourceId: id } });
    });
    return ok({ deleted: true });
  } catch (error) { return fail(error); }
}
