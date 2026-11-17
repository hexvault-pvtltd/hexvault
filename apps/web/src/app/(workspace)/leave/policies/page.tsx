import { currentUser } from "@core/lib/auth";
import { redirect } from "next/navigation";
import { LeavePolicyManager } from "@/components/leave-policy-manager";

export default async function LeavePoliciesPage() {
  const actor = await currentUser();
  if (!actor?.roles.some(role => ["OWNER", "HR"].includes(role))) redirect("/leave");
  return <><div className="mb-7"><p className="text-xs text-slate-400">People / Leave</p><h1 className="mt-2 text-2xl font-semibold">Leave policies</h1><p className="mt-1 text-sm text-slate-500">Create leave types and set annual day allowances. A blank allowance does not cap usage.</p></div><LeavePolicyManager/></>;
}
