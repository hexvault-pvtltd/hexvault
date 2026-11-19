import { currentUser } from "@core/lib/auth";
import { cdnFolderAccess } from "@core/features/cdn/permissions";
import { db } from "@core/lib/db";
import { MAX_CDN_UPLOAD_BYTES, readPrivateObject } from "@core/lib/storage";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const inlineImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const asset = await db.cdnAsset.findUnique({ where: { id }, include: { file: true, folder: { select: { id: true, active: true } } } });
    if (!asset || !asset.folder.active || asset.file.scanStatus !== "CLEAN") return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN file not found." } }, { status: 404 });

    if (!asset.isPublic) {
      const actor = await currentUser();
      if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to access this file." } }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
      if (!await cdnFolderAccess(actor, asset.folderId)) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to this file." } }, { status: 403, headers: { "Cache-Control": "private, no-store" } });
    }

    const object = await readPrivateObject(asset.file.storageKey, MAX_CDN_UPLOAD_BYTES);
    const mimeType = asset.file.mimeType.toLowerCase();
    const inline = inlineImageTypes.has(mimeType);
    const safeName = asset.file.originalFilename.replace(/[\r\n"\\]/g, "_").slice(0, 180) || "cdn-file";
    const headers = new Headers({
      "Content-Type": inline ? mimeType : "application/octet-stream",
      "Content-Length": String(object.contentLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": asset.isPublic ? "public, max-age=60, s-maxage=60, stale-while-revalidate=30" : "private, no-store",
    });
    if (asset.file.checksum) headers.set("ETag", `"${asset.file.checksum}"`);
    return new Response(new Uint8Array(object.bytes), { status: 200, headers });
  } catch (error) {
    if (error instanceof Error && (error.message === "NotFound" || error.message === "INVALID_OBJECT_SIZE")) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN file not found." } }, { status: 404 });
    console.error("cdn_content_read_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The CDN file could not be served." } }, { status: 500 });
  }
}
