import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { cdnFolderAccess } from "@core/features/cdn/permissions";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id: folderId } = await params;
    const folder = await db.cdnFolder.findUnique({ where: { id: folderId }, select: { id: true, active: true } });
    if (!folder || !folder.active) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN folder not found." } }, { status: 404 });
    const access = await cdnFolderAccess(actor, folderId);
    if (!access) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to this CDN folder." } }, { status: 403 });
    const assets = await db.cdnAsset.findMany({
      where: { folderId, file: { is: { scanStatus: "CLEAN" } } },
      include: { file: { select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true, checksum: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return ok({ items: assets.map(({ file, ...asset }) => ({ ...asset, file: { ...file, sizeBytes: Number(file.sizeBytes) }, contentUrl: `/api/v1/cdn/assets/${asset.id}/content` })), access });
  } catch (error) { return fail(error); }
}
