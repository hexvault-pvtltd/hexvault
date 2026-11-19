import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { InviteEmployeeButton } from "@/components/invite-employee-button";
import { EmployeeLifecycleActions } from "@/components/employee-lifecycle-actions";
import { EmployeePasswordUpdate } from "@/components/employee-password-update";
import { EmployeePerformance } from "@/components/employee-performance";
import { EmployeeWorkRecord } from "@/components/employee-work-record";
import { parseWorkRecordQuery } from "@core/features/employees/work-record";
import { canViewDraftReviews, describeProfileHistory, profileHistoryWhere } from "@core/features/performance/profile-history";

export default async function EmployeeDetail({ params, searchParams }: { params: Promise<{ employeeId: string }>; searchParams: Promise<{ historyPage?: string; record?: string; recordPage?: string }> }) {
  const user = await currentUser();
  if (!user) notFound();
  const { employeeId } = await params;
  const visible = user ? await visibleEmployeeIds(user) : [];
  if (user.employee?.id !== employeeId && visible !== null && !visible.includes(employeeId)) notFound();
  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: {
    user: { select: { status: true } }, department: true,
    periods: { orderBy: { startDate: "desc" } },
    memberships: { where: { endedAt: null }, include: { team: { include: { department: true } } } },
  } });
  if (!employee) notFound();
  const search = await searchParams;
  const recordQuery = parseWorkRecordQuery(search.record, search.recordPage);
  const requestedPage = Number(search.historyPage ?? "1");
  const historyPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const historyWhere = profileHistoryWhere(employee.id, user?.roles ?? []);
  const [reviews, goals, history, historyCount] = await Promise.all([
    db.performanceReview.findMany({ where: { employeeId: employee.id, ...(!canViewDraftReviews(user?.roles ?? []) ? { publicationStatus: "PUBLISHED" } : {}) }, orderBy: [{ periodEnd: "desc" }, { id: "desc" }], take: 20 }),
    db.employeeGoal.findMany({ where: { employeeId: employee.id }, orderBy: [{ targetDate: "asc" }, { id: "desc" }], take: 20 }),
    db.employeeHistory.findMany({ where: historyWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (historyPage - 1) * 20 }),
    db.employeeHistory.count({ where: historyWhere }),
  ]);
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
    <nav aria-label="Employee profile sections" className="mb-5 flex flex-wrap gap-2">{[["Work record", "work-record"], ["Performance", "profile-performance"], ["Activity history", "profile-history"]].map(([label, id]) => <a key={id} href={`#${id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{label}</a>)}</nav>
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
    <EmployeeWorkRecord actor={user} employeeId={employee.id} scope={visible} record={search.record} recordPage={search.recordPage} historyPage={historyPage}/>
    <EmployeePerformance reviews={reviews} goals={goals}/>
    <section id="profile-history" className="mt-5 scroll-mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Profile activity history</h2>{history.length ? history.map(item => {
      const entry = describeProfileHistory(item);
      return <article key={item.id} className="border-b border-slate-100 py-4 last:border-0"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-xs font-semibold">{entry.title}</h3><time dateTime={item.createdAt.toISOString()} className="text-[10px] text-slate-400">{item.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</time></div>{entry.detail && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{entry.detail}</p>}{entry.href && <Link href={entry.href} className="mt-2 inline-block text-[11px] font-semibold text-violet-700 hover:underline">View record</Link>}</article>;
    }) : <p className="mt-5 text-xs text-slate-400">No profile history recorded on this page.</p>}
      {historyCount > 20 && <nav aria-label="Profile history pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs"><span className="text-slate-500">Page {historyPage} of {Math.ceil(historyCount / 20)}</span><div className="flex gap-4">{historyPage > 1 && <Link href={`/workforce/${employee.id}?record=${recordQuery.tab}&recordPage=${recordQuery.page}&historyPage=${historyPage - 1}#profile-history`} className="font-semibold text-violet-700">Newer activity</Link>}{historyPage * 20 < historyCount && <Link href={`/workforce/${employee.id}?record=${recordQuery.tab}&recordPage=${recordQuery.page}&historyPage=${historyPage + 1}#profile-history`} className="font-semibold text-violet-700">Older activity</Link>}</div></nav>}
    </section>
  </>;
}
