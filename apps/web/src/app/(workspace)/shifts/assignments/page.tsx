import { currentUser } from "@core/lib/auth";
import { redirect } from "next/navigation";
import { ShiftAssignmentManager } from "@/components/shift-management";

export default async function ShiftAssignmentsPage() {
  const actor = await currentUser();
  if (!actor?.roles.some(role => ["OWNER", "HR"].includes(role))) redirect("/dashboard");
  return <><div className="mb-7"><p className="text-xs text-slate-400">People / Scheduling</p><h1 className="mt-2 text-2xl font-semibold">Shift assignments</h1><p className="mt-1 text-sm text-slate-500">Set an employee&apos;s shift and effective date range. Date ranges cannot overlap.</p></div><ShiftAssignmentManager/></>;
}
