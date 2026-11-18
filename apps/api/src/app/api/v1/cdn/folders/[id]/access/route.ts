import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const grantSchema = z.object({ userId: z.string().uuid(), canView: z.boolean().default(true), canUpload: z.boolean().default(false), canManage: z.boolean().default(false) }).strict();

async function ownerOnly() {
  const actor = await currentUser();
  if (!actor) return { response: NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 }) };
  if (!actor.roles.includes("OWNER")) return { response: NextResponse.json({ error: { code: "FORBIDDEN", message: "Only an Owner can manage CDN access." } }, { status: 403 }) };
  return { actor };
}

export async function GET(_request: Request, { params }: Context) {
  const auth = await ownerOnly();
  if (auth.response) return auth.response;
  const { id } = await params;
  const grants = await db.cdnFolderGrant.findMany({
    where: { folderId: id },
    include: { user: { select: { id: true, email: true, employee: { select: { fullName: true, employeeCode: true, lifecycleStatus: true } } } } },
    orderBy: [{ user: { email: "asc" } }],
  });
  return ok({ items: grants });
}

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await ownerOnly();
  if (auth.response) return auth.response;
  try {
    const { id: folderId } = await params;
    const input = grantSchema.parse(await request.json());
    const [folder, user] = await Promise.all([
      db.cdnFolder.findUnique({ where: { id: folderId }, select: { id: true, active: true } }),
      db.user.findFirst({ where: { id: input.userId, status: "ACTIVE", employee: { is: { lifecycleStatus: "ACTIVE" } } }, select: { id: true } }),
    ]);
    if (!folder || !folder.active) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Active CDN folder not found." } }, { status: 404 });
    if (!user) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Choose an active employee account." } }, { status: 404 });
    if (!input.canView && (input.canUpload || input.canManage)) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Upload and management access also require view access." } }, { status: 422 });
    const data = { canView: input.canView || input.canManage || input.canUpload, canUpload: input.canUpload || input.canManage, canManage: input.canManage };
    const grant = await db.cdnFolderGrant.upsert({
      where: { folderId_userId: { folderId, userId: user.id } },
      create: { folderId, userId: user.id, createdBy: auth.actor.id, ...data },
      update: data,
      include: { user: { select: { id: true, email: true, employee: { select: { fullName: true, employeeCode: true } } } } },
    });
    await db.auditLog.create({ data: { actorId: auth.actor.id, action: "cdn.access_granted", resourceType: "cdn_folder", resourceId: folderId, metadata: { userId: user.id, ...data } } });
    return ok({ item: grant }, 201);
  } catch (error) { return fail(error); }
}
