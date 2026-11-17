import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { AttendanceActions } from "@/components/attendance-actions";
import { visibleEmployeeIds } from "@core/lib/scope";
import { netWorkMinutes } from "@core/lib/domain";
import { CalendarDays, Clock3 } from "lucide-react";

const zone = () => process.env.COMPANY_TIMEZONE ?? "Asia/Kolkata";
const clock = (date: Date) => date.toLocaleTimeString("en-IN", { timeZone: zone(), hour: "2-digit", minute: "2-digit" });

export default async function Attendance() {
  const user = await currentUser();
  const visible = user ? await visibleEmployeeIds(user) : [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: zone(), year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const workDate = new Date(`${today}T00:00:00.000Z`);
  const [session, rows] = await Promise.all([
    user?.employee ? db.attendanceSession.findFirst({ where: { employeeId: user.employee.id, workDate }, include: { breaks: { select: { id: true, startedAt: true, endedAt: true } } }, orderBy: { checkInAt: "desc" } }) : null,
    db.attendanceSession.findMany({ where: { workDate, ...(visible === null ? {} : { employeeId: { in: visible } }) }, select: { id: true, checkInAt: true, checkOutAt: true, status: true, employee: { select: { id: true, fullName: true } } }, orderBy: { checkInAt: "desc" }, take: 100 }),
  ]);
  const asOf = new Date();
  const workedMinutes = session ? netWorkMinutes(session.checkInAt, session.checkOutAt ?? asOf, session.breaks.map(item => ({ start: item.startedAt, end: item.endedAt ?? asOf }))) : 0;
  return <>
    <div className="mb-7"><p className="text-xs text-slate-400">People / Attendance</p><h1 className="mt-2 text-2xl font-semibold">Attendance</h1><p className="mt-1 text-sm text-slate-500">Your attendance record and authorized team activity.</p></div>
    <section className="mb-6 grid gap-4 md:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold">Today’s attendance</p><p className="mt-1 text-[11px] text-slate-400">{today} · {zone()}</p></div><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><CalendarDays size={17}/></span></div>
        {session ? <div className="mt-6 flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-emerald-500"/><p className="text-xs text-slate-600">Checked in at <b>{clock(session.checkInAt)}</b>{session.checkOutAt ? <> · Checked out at <b>{clock(session.checkOutAt)}</b></> : null}</p></div> : <p className="mt-6 text-xs text-slate-500">No check-in recorded yet today.</p>}
        {session && <p className="mt-2 text-[11px] text-slate-500">Net working time: <b>{Math.floor(workedMinutes / 60)}h {workedMinutes % 60}m</b></p>}
        <div className="mt-5"><AttendanceActions open={Boolean(session && !session.checkOutAt)} breakOpen={Boolean(session?.breaks.some(item => !item.endedAt))}/></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold">Attendance and work stay distinct</p><p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-500">A check-in tracks presence. Tasks and work logs capture progress separately.</p></div><Clock3 size={17} className="text-slate-400"/></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 rounded-full bg-[#dc4b12]"/></div><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>Attendance</span><span>Work progress</span></div></div>
    </section>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold">Today’s sessions</h2></div>
      {rows.length ? rows.map(row => <div key={row.id} className="flex items-center justify-between border-b border-slate-50 px-5 py-4 last:border-0"><div><p className="text-xs font-semibold">{row.employee.fullName}</p><p className="mt-1 text-[11px] text-slate-400">In {clock(row.checkInAt)}{row.checkOutAt ? ` · Out ${clock(row.checkOutAt)}` : " · In progress"}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{row.status}</span></div>) : <p className="px-5 py-12 text-center text-xs text-slate-400">No attendance sessions yet.</p>}
    </div>
  </>;
}
