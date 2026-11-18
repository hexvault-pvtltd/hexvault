import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string; grantId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only an Owner can revoke CDN access." } }, { status: 403 });
  try {
    const { id: folderId, grantId } = await params;
    const result = await db.cdnFolderGrant.deleteMany({ where: { id: grantId, folderId } });
    if (!result.count) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN access grant not found." } }, { status: 404 });
    await db.auditLog.create({ data: { actorId: actor.id, action: "cdn.access_revoked", resourceType: "cdn_folder", resourceId: folderId, metadata: { grantId } } });
    return ok({ revoked: true });
  } catch (error) { return fail(error); }
}
