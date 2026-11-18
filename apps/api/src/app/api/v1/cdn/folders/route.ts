import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

const createSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(400).nullable().optional() }).strict();

export async function GET() {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const owner = actor.roles.includes("OWNER");
    const folders = await db.cdnFolder.findMany({
      where: { active: true, ...(owner ? {} : { grants: { some: { userId: actor.id, canView: true } } }) },
      select: {
        id: true, name: true, description: true, createdAt: true, updatedAt: true,
        _count: { select: { assets: true, grants: true } },
        grants: { where: { userId: actor.id }, select: { canView: true, canUpload: true, canManage: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });
    return ok({ items: folders.map(({ grants, ...folder }) => ({ ...folder, access: owner ? { canView: true, canUpload: true, canManage: true } : grants[0] })) });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  if (!actor.roles.includes("OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only an Owner can create CDN folders." } }, { status: 403 });
  try {
    const input = createSchema.parse(await request.json());
    const folder = await db.cdnFolder.create({ data: { ...input, createdBy: actor.id } });
    await db.auditLog.create({ data: { actorId: actor.id, action: "cdn.folder_created", resourceType: "cdn_folder", resourceId: folder.id } });
    return ok({ item: { ...folder, access: { canView: true, canUpload: true, canManage: true }, _count: { assets: 0, grants: 0 } } }, 201);
  } catch (error) { return fail(error); }
}
