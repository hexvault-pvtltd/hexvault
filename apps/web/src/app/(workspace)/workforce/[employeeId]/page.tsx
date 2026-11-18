import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { InviteEmployeeButton } from "@/components/invite-employee-button";
import { EmployeeLifecycleActions } from "@/components/employee-lifecycle-actions";
import { EmployeePasswordUpdate } from "@/components/employee-password-update";

export default async function EmployeeDetail({ params }: { params: Promise<{ employeeId: string }> }) {
  const user = await currentUser();
  const { employeeId } = await params;
  const visible = user ? await visibleEmployeeIds(user) : [];
  if (visible !== null && !visible.includes(employeeId)) notFound();
  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: {
    user: { select: { status: true } }, department: true,
    periods: { orderBy: { startDate: "desc" } },
    memberships: { where: { endedAt: null }, include: { team: { include: { department: true } } } },
    history: { orderBy: { createdAt: "desc" }, take: 20 },
  } });
  if (!employee) notFound();
  const canInvite = user?.roles.some(role => ["OWNER", "HR"].includes(role));
  const canViewDocuments = user?.roles.some(role => ["OWNER", "HR"].includes(role)) || (user?.employee?.id === employeeId && user.roles.some(role => ["STAFF", "INTERN"].includes(role)));
  return <>
    <div className="mb-7">
      <p className="text-xs text-slate-400"><Link href="/workforce" className="hover:text-slate-600">Workforce</Link> / Profile</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-lg font-semibold text-violet-700">{employee.fullName.split(" ").map(value => value[0]).join("").slice(0, 2)}</span>
        <div><h1 className="text-2xl font-semibold">{employee.fullName}</h1><p className="mt-1 text-sm text-slate-500">{employee.title ?? "Employee"} · {employee.employeeCode}</p></div>
        <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-medium text-emerald-700">{employee.lifecycleStatus}</span>
        {canViewDocuments && <Link href={`/workforce/${employee.id}/documents`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Documents</Link>}
        {user?.roles.includes("OWNER") && <Link href={`/workforce/${employee.id}/notes`} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">Private notes</Link>}
        {user?.roles.some(role => ["OWNER", "HR"].includes(role)) && <Link href={`/workforce/${employee.id}/edit`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Edit profile</Link>}
        {canInvite && (!employee.user || employee.user.status === "INVITED") && <InviteEmployeeButton employeeId={employee.id} whatsappNumber={employee.phone} owner={user?.roles.includes("OWNER") ?? false} resend={employee.user?.status === "INVITED"} />}
      </div>
    </div>
    {canInvite && employee.user?.status === "ACTIVE" && <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Account security</h2><p className="mt-1 text-xs text-slate-500">Set a temporary password for this employee. Their active sessions will be signed out.</p><div className="mt-4"><EmployeePasswordUpdate employeeId={employee.id} /></div></section>}
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Employee information</h2><div className="mt-5 grid grid-cols-2 gap-5">
        <div><p className="text-[10px] text-slate-400">Work email</p><p className="mt-1 text-xs font-medium">{employee.workEmail}</p></div>
        <div><p className="text-[10px] text-slate-400">Department</p><p className="mt-1 text-xs font-medium">{employee.department?.name ?? "Unassigned"}</p></div>
        <div><p className="text-[10px] text-slate-400">WhatsApp number</p><p className="mt-1 text-xs font-medium">{employee.phone ?? "—"}</p></div>
        <div><p className="text-[10px] text-slate-400">Teams</p><p className="mt-1 text-xs font-medium">{employee.memberships.map(item => item.team.name).join(", ") || "—"}</p></div>
        <div><p className="text-[10px] text-slate-400">Account</p><p className="mt-1 text-xs font-medium">{employee.user?.status ?? "Invitation not sent"}</p></div>
      </div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Employment history</h2>{employee.periods.length ? employee.periods.map(period => <div key={period.id} className="mt-4 border-l-2 border-violet-200 pl-3"><p className="text-xs font-semibold">{period.title ?? period.employmentType}</p><p className="mt-1 text-[10px] text-slate-500">{period.startDate.toLocaleDateString()} – {period.endDate?.toLocaleDateString() ?? "Current"}</p><p className="mt-1 text-[10px] text-slate-400">{period.status}</p></div>) : <p className="mt-4 text-xs text-slate-400">No employment periods recorded.</p>}</section>
    </div>
    {user?.roles.includes("OWNER") && <EmployeeLifecycleActions employeeId={employee.id} status={employee.lifecycleStatus} />}
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Recent history</h2>{employee.history.length ? employee.history.map(item => <div key={item.id} className="flex justify-between gap-4 border-b border-slate-50 py-3 last:border-0"><span className="text-xs font-medium">{item.eventType.replaceAll("_", " ")}</span><span className="text-[10px] text-slate-400">{item.createdAt.toLocaleString()}</span></div>) : <p className="mt-5 text-xs text-slate-400">No profile history recorded.</p>}</section>
  </>;
}
