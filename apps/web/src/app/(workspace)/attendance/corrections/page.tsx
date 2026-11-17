import { currentUser } from "@core/lib/auth";
import { AttendanceCorrections } from "@/components/attendance-corrections";

export default async function AttendanceCorrectionsPage() {
  const actor = await currentUser();
  const canReview = Boolean(actor?.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD"].includes(role)));
  return <><div className="mb-7"><p className="text-xs text-slate-400">People / Attendance</p><h1 className="mt-2 text-2xl font-semibold">Attendance corrections</h1><p className="mt-1 text-sm text-slate-500">Request a correction or review requests within your authorized scope.</p></div><AttendanceCorrections canReview={canReview}/></>;
}
