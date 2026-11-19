import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { AttendanceActions } from "@/components/attendance-actions";
import { visibleEmployeeIds } from "@core/lib/scope";
import { netWorkMinutes } from "@core/lib/domain";
import { personalAttendance } from "@core/features/attendance/overview";
import { CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";

const zone = () => process.env.COMPANY_TIMEZONE ?? "Asia/Kolkata";
const clock = (date: Date) => date.toLocaleTimeString("en-IN", { timeZone: zone(), hour: "2-digit", minute: "2-digit" });
const duration = (minutes: number) => Math.floor(minutes / 60) + "h " + (minutes % 60) + "m";

export default async function Attendance() {
  const user = await currentUser();
  const visible = user ? await visibleEmployeeIds(user) : [];
  const asOf = new Date();
  const { session, workDate, totals } = await personalAttendance(user?.employee?.id, asOf);
  const today = workDate.toISOString().slice(0, 10);
  const where = { workDate, ...(visible === null ? {} : { employeeId: { in: visible } }) };
  const [rows, total] = await Promise.all([
    db.attendanceSession.findMany({ where, select: { id: true, checkInAt: true, checkOutAt: true, status: true, employee: { select: { id: true, fullName: true } } }, orderBy: [{ checkInAt: "desc" }, { id: "desc" }], take: 100 }),
    db.attendanceSession.count({ where }),
  ]);
  const workedMinutes = session ? netWorkMinutes(session.checkInAt, session.checkOutAt ?? asOf, session.breaks.map(item => ({ start: item.startedAt, end: item.endedAt ?? session.checkOutAt ?? asOf }))) : 0;
  const open = Boolean(session && !session.checkOutAt);
  const onBreak = Boolean(open && session?.breaks.some(item => !item.endedAt));
  const carriedOver = open && session?.workDate.toISOString().slice(0, 10) !== today;
  return <>
    <div className="mb-7"><p className="text-xs text-slate-400">People / Attendance</p><h1 className="mt-2 text-2xl font-semibold">Attendance</h1><p className="mt-1 text-sm text-slate-500">Your attendance record and authorized team activity.</p></div>
    <section className="mb-6 grid gap-4 md:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between"><div><h2 className="text-xs font-semibold">Your attendance</h2><p className="mt-1 text-[11px] text-slate-400">{today} / {zone()}</p></div><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-600"><CalendarDays size={17}/></span></div>
        {session ? <div className="mt-6"><p className="text-xs font-semibold text-slate-700">{onBreak ? "On break" : open ? "Checked in" : "Checked out"}</p><p className="mt-2 text-xs text-slate-600">Checked in at <b>{clock(session.checkInAt)}</b>{session.checkOutAt ? <> / Checked out at <b>{clock(session.checkOutAt)}</b></> : null}</p><p className="mt-2 text-[11px] text-slate-500">Net working time for this session: <b>{duration(workedMinutes)}</b></p></div> : <p className="mt-6 text-xs text-slate-500">No check-in recorded yet today.</p>}
        {carriedOver && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">You still have an open session from {session?.workDate.toISOString().slice(0, 10)}. End any break and check out before starting a new session.</p>}
        <div className="mt-5"><AttendanceActions open={open} breakOpen={onBreak} enabled={Boolean(user?.employee)}/></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-start justify-between"><div><h2 className="text-xs font-semibold">Your recorded totals today</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">Calculated from sessions assigned to {today}. Updates every minute.</p></div><Clock3 size={17} className="text-slate-400"/></div><dl className="mt-5 grid gap-4 sm:grid-cols-3"><div><dt className="text-[11px] text-slate-500">Sessions</dt><dd className="mt-1 text-lg font-semibold">{totals.sessions}</dd></div><div><dt className="text-[11px] text-slate-500">Net working time</dt><dd className="mt-1 text-lg font-semibold">{duration(totals.workedMinutes)}</dd></div><div><dt className="text-[11px] text-slate-500">Break time</dt><dd className="mt-1 text-lg font-semibold">{duration(totals.breakMinutes)}</dd></div></dl><Link href="/attendance/corrections" className="mt-5 inline-block text-xs font-semibold text-[#c75534]">Request an attendance correction</Link></div>
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="today-sessions"><div className="border-b border-slate-100 px-5 py-4"><h2 id="today-sessions" className="text-sm font-semibold">Today&apos;s sessions</h2><p className="mt-1 text-xs text-slate-500">{total} recorded in your authorized scope{total > rows.length ? " / showing the latest " + rows.length : ""}</p></div>
      {rows.length ? rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 px-5 py-4 last:border-0"><div><p className="text-xs font-semibold">{row.employee.fullName}</p><p className="mt-1 text-[11px] text-slate-400">In {clock(row.checkInAt)}{row.checkOutAt ? " / Out " + clock(row.checkOutAt) : " / In progress"}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{row.status.replaceAll("_", " ")}</span></div>) : <p className="px-5 py-12 text-center text-xs text-slate-400">No attendance sessions yet.</p>}
    </section>
  </>;
}
