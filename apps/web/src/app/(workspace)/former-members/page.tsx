import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { getFormerMember } from "@core/features/employees/former-members";
import { EmployeeLifecycleActions } from "@/components/employee-lifecycle-actions";

export default async function FormerMemberDetail({ params }: { params: Promise<{ employeeId: string }> }) {
  const actor = await currentUser();
  if (!actor || !actor.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) notFound();
  const { employeeId } = await params;
  let employee;
  try { employee = await getFormerMember(actor, employeeId); } catch { notFound(); }
  return <div className="mx-auto w-full max-w-4xl"><p className="text-xs text-slate-400"><Link href="/former-members" className="hover:text-slate-700">Former members</Link> / History</p><header className="mt-3 rounded-[18px] border border-[#ececea] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Former employee record</p><h1 className="mt-2 text-xl font-semibold">{employee.fullName}</h1><p className="mt-1 text-xs text-slate-500">{employee.employeeCode} · {employee.title ?? "Employee"} · {employee.department?.name ?? "No department"}</p><p className="mt-2 text-xs text-slate-500">{employee.workEmail}</p></header><section className="mt-5 rounded-[18px] border border-[#ececea] bg-white p-5"><h2 className="text-sm font-semibold">Employment periods</h2>{employee.periods.length ? employee.periods.map(period => <article key={period.id} className="mt-4 border-l-2 border-slate-200 pl-3"><p className="text-xs font-medium">{period.title ?? period.employmentType}</p><p className="mt-1 text-[10px] text-slate-500">{period.startDate.toLocaleDateString()} – {period.endDate?.toLocaleDateString() ?? "End date not recorded"} · {period.status}</p>{period.exitReason && <p className="mt-1 text-[10px] text-slate-500">Exit reason: {period.exitReason}</p>}</article>) : <p className="mt-4 text-xs text-slate-500">No employment periods recorded.</p>}</section><section className="mt-5 rounded-[18px] border border-[#ececea] bg-white p-5"><h2 className="text-sm font-semibold">Lifecycle history</h2>{employee.history.length ? employee.history.map(event => <article key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-3 last:border-0"><span className="text-xs font-medium">{event.eventType.replaceAll("_", " ")}</span><time className="text-[10px] text-slate-400">{event.createdAt.toLocaleString()}</time></article>) : <p className="mt-4 text-xs text-slate-500">No lifecycle events recorded.</p>}</section>{actor.roles.includes("OWNER") && <EmployeeLifecycleActions employeeId={employee.id} status="EXITED" />}</div>;
}
