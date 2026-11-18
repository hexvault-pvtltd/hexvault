import { redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { Workspace } from "@/components/workspace";
export default async function AppLayout({children}:{children:React.ReactNode}) { const user=await currentUser(); if(!user) redirect("/login"); return <Workspace name={user.employee?.fullName ?? user.email} role={user.roles[0] ?? "STAFF"} roles={user.roles}>{children}</Workspace>; }
