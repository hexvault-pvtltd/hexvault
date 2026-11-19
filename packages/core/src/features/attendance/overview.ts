import { db } from "../../lib/db";
import { netWorkMinutes } from "../../lib/domain";
import { companyWorkDate } from "../../lib/time";

type RecordedSession = { checkInAt: Date; checkOutAt: Date | null; breaks: { startedAt: Date; endedAt: Date | null }[] };
export function attendanceTotals(sessions: RecordedSession[], now: Date) {
  let workedMinutes = 0;
  let breakMinutes = 0;
  for (const session of sessions) {
    const end = session.checkOutAt ?? now;
    const ranges = session.breaks.map(item => ({ start: item.startedAt, end: item.endedAt ?? end }));
    const worked = netWorkMinutes(session.checkInAt, end, ranges);
    workedMinutes += worked;
    breakMinutes += Math.floor((end.getTime() - session.checkInAt.getTime()) / 60000) - worked;
  }
  return { sessions: sessions.length, workedMinutes, breakMinutes };
}

export async function personalAttendance(employeeId: string | undefined, now = new Date(), database = db) {
  const workDate = companyWorkDate(now);
  if (!employeeId) return { session: null, workDate, totals: attendanceTotals([], now) };
  const [open, today] = await Promise.all([
    database.attendanceSession.findFirst({ where: { employeeId, checkOutAt: null }, include: { breaks: true }, orderBy: { checkInAt: "desc" } }),
    database.attendanceSession.findMany({ where: { employeeId, workDate }, include: { breaks: true }, orderBy: { checkInAt: "desc" } }),
  ]);
  return { session: open ?? today[0] ?? null, workDate, totals: attendanceTotals(today, now) };
}
