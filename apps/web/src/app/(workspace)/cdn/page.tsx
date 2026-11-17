import { redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { CdnManager } from "@/components/cdn-manager";

export default async function CdnPage() {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  const owner = actor.roles.includes("OWNER");
  const [folders, users] = await Promise.all([
    db.cdnFolder.findMany({
      where: { active: true, ...(owner ? {} : { grants: { some: { userId: actor.id, canView: true } } }) },
      select: {
        id: true, name: true, description: true,
        _count: { select: { assets: true, grants: true } },
        grants: { where: { userId: actor.id }, select: { canView: true, canUpload: true, canManage: true } },
      },
      orderBy: { name: "asc" }, take: 200,
    }),
    owner ? db.user.findMany({
      where: { status: "ACTIVE", employee: { is: { lifecycleStatus: "ACTIVE" } } },
      select: { id: true, email: true, employee: { select: { fullName: true, employeeCode: true } }, roles: { where: { revokedAt: null }, select: { role: { select: { code: true } } } } },
      orderBy: { email: "asc" }, take: 500,
    }) : Promise.resolve([]),
  ]);
  const people = users.filter(user => !user.roles.some(item => item.role.code === "OWNER")).map(({ id, email, employee }) => ({ id, email, employee: employee! }));
  const initialFolders = folders.map(({ grants, ...folder }) => ({ ...folder, access: owner ? { canView: true, canUpload: true, canManage: true } : grants[0] }));
  return <CdnManager initialFolders={initialFolders} people={people} owner={owner} appUrl={process.env.APP_URL ?? "http://localhost:3000"}/>;
}
