import { redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { Workspace } from "@/components/workspace";
import { canPrepareLetters } from "@core/features/letters/access";
export default async function AppLayout({children}:{children:React.ReactNode}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const roles = [...user.roles];
  // This UI capability does not grant a server role; every letter route checks
  // the user's current project ownership or membership independently.
  const canPrepare = await canPrepareLetters(user);
  return <Workspace name={user.employee?.fullName ?? user.email} role={user.roles[0] ?? "STAFF"} roles={canPrepare ? [...roles, "PROJECT_MANAGER"] : roles}>{children}</Workspace>;
}
