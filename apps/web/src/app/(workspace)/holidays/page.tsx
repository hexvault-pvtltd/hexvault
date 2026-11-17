import { currentUser } from "@core/lib/auth";
import { redirect } from "next/navigation";
import { HolidayManagement } from "@/components/holiday-management";

export default async function HolidaysPage() {
  const actor = await currentUser();
  if (!actor?.roles.some(role => ["OWNER", "HR"].includes(role))) redirect("/dashboard");
  return <><div className="mb-7"><p className="text-xs text-slate-400">People / Scheduling</p><h1 className="mt-2 text-2xl font-semibold">Holidays</h1><p className="mt-1 text-sm text-slate-500">Manage company-wide and department holidays.</p></div><HolidayManagement/></>;
}
