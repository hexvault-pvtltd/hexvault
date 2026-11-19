import Link from "next/link";
import { employeeWorkRecord, parseWorkRecordQuery, workRecordTabs, type RecordActor, type WorkRecordTab } from "@core/features/employees/work-record";

const labels: Record<WorkRecordTab, string> = { tasks: "Tasks", projects: "Projects", journals: "Work journals", time: "Tracked time", goals: "Goals", reviews: "Reviews", attendance: "Attendance", leave: "Leave", teams: "Team history" };
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export async function EmployeeWorkRecord({ actor, employeeId, scope, record, recordPage, historyPage }: { actor: RecordActor; employeeId: string; scope: string[] | null; record?: string; recordPage?: string; historyPage: number }) {
  const query = parseWorkRecordQuery(record, recordPage);
  const data = await employeeWorkRecord(actor, employeeId, scope, query);
  const href = (tab: WorkRecordTab, page = 1) => `/workforce/${employeeId}?record=${tab}&recordPage=${page}&historyPage=${historyPage}#work-record`;
  const metrics = [
    ["Tasks involved in", data.metrics.assigned], ["Completed tasks involved in", data.metrics.completed], ["Projects", data.metrics.projects], ["Completed goals", data.metrics.completedGoals],
    ["Journal time", duration(data.metrics.journalMinutes)], ["Tracked time", duration(data.metrics.trackedMinutes)], ["Attendance sessions", data.metrics.attendance], ["Approved leave requests", data.metrics.approvedLeave],
  ];
  return <section id="work-record" aria-labelledby="work-record-title" className="mt-5 scroll-mt-5 space-y-4">
    <div><h2 id="work-record-title" className="text-base font-semibold">Work record</h2><p className="mt-1 text-xs text-slate-500">Tasks include assignments, creation, comments, status changes, journal entries, and tracked time. Journal time and tracked time are shown separately.</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}</div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <nav aria-label="Employee work record categories" className="flex flex-wrap gap-2 border-b border-slate-100 p-4">{workRecordTabs.map(tab => <Link key={tab} href={href(tab)} aria-current={tab === data.tab ? "page" : undefined} className={`rounded-full px-3 py-2 text-xs font-semibold ${tab === data.tab ? "bg-violet-100 text-violet-800" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{labels[tab]}</Link>)}</nav>
      <div className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{labels[data.tab]}</h3><span className="text-xs text-slate-400">{data.total} records</span></div>
        {data.records.length ? <div className="mt-3 divide-y divide-slate-100">{data.records.map(item => <article key={item.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold">{item.href ? <Link href={item.href} className="text-violet-700 hover:underline">{item.title}</Link> : item.title}</h4>{item.subtitle && <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>}</div><span className={`rounded-full px-2 py-1 text-[10px] ${["DONE", "COMPLETED", "APPROVED", "PUBLISHED"].includes(item.status) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status.replaceAll("_", " ")}</span></div>{item.date && <time dateTime={item.date.toISOString()} className="mt-2 block text-[10px] text-slate-400">{item.date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</time>}<div className="mt-3 space-y-2">{item.details.map((detail, index) => <p key={index} className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{detail}</p>)}</div></article>)}</div> : <p className="py-10 text-center text-xs text-slate-500">No {labels[data.tab].toLowerCase()} records on this page.</p>}
        {(data.total > data.pageSize || data.page > 1) && <nav aria-label="Work record pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs"><span className="text-slate-500">Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><div className="flex gap-4">{data.page > 1 && <Link href={href(data.tab, data.page - 1)} className="font-semibold text-violet-700">Previous</Link>}{data.page * data.pageSize < data.total && <Link href={href(data.tab, data.page + 1)} className="font-semibold text-violet-700">Next</Link>}</div></nav>}
      </div>
    </section>
  </section>;
}
