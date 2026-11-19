import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { cdnFolderAccess } from "@core/features/cdn/permissions";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), description: z.string().trim().max(400).nullable().optional(), active: z.boolean().optional() }).strict();

export async function GET(_request: Request, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  const folder = await db.cdnFolder.findUnique({ where: { id } });
  if (!folder || !folder.active) return NextResponse.json({ error: { code: "NOT_FOUND", message: "CDN folder not found." } }, { status: 404 });
  const access = await cdnFolderAccess(actor, id);
  if (!access) return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have access to this CDN folder." } }, { status: 403 });
  return ok({ item: { ...folder, access } });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only an Owner can change CDN folders." } }, { status: 403 });
  try {
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    if (!Object.keys(input).length) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Choose a folder setting to update." } }, { status: 422 });
    const item = await db.cdnFolder.update({ where: { id }, data: input });
    await db.auditLog.create({ data: { actorId: actor.id, action: item.active ? "cdn.folder_updated" : "cdn.folder_archived", resourceType: "cdn_folder", resourceId: id } });
    return ok({ item });
  } catch (error) { return fail(error); }
}
