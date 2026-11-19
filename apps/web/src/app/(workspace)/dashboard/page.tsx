import { db } from "@core/lib/db";
import { currentUser } from "@core/lib/auth";
import { Activity, ArrowUpRight, BriefcaseBusiness, CalendarCheck2, CheckCircle2, Clock3, Users } from "lucide-react";
import { visibleEmployeeIds } from "@core/lib/scope";
import { companyWorkDate } from "@core/lib/time";
import Link from "next/link";
import { V4MetricCard, V4PageHeader, V4StatusBadge } from "@/components/v4";
import { EmploymentCertificates } from "@/components/employment-certificates";
import { PersonalGoalsSummary } from "@/components/personal-goals-summary";

export default async function Dashboard() {
  const user = await currentUser();
  const visible = user ? await visibleEmployeeIds(user) : [];
  const employeeFilter = visible === null ? {} : { id: { in: visible } };
  const assignmentFilter = visible === null ? {} : { assignees: { some: { employeeId: { in: visible }, unassignedAt: null } } };
  const today = companyWorkDate();
  const todayEnd = new Date(today.getTime() + 86_399_999);
  const weekStart = new Date(today);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const [activeEmployees, presentEmployees, onLeave, activeProjects, openTasks, pendingLeave, pendingCorrections, projects, recentTasks, weeklyAttendance] = await Promise.all([
    db.employee.count({ where: { ...employeeFilter, lifecycleStatus: "ACTIVE" } }),
    db.attendanceSession.groupBy({ by: ["employeeId"], where: { workDate: today, ...(visible === null ? {} : { employeeId: { in: visible } }) } }),
    db.leaveRequest.count({ where: { status: "APPROVED", startDate: { lte: todayEnd }, endDate: { gte: today }, ...(visible === null ? {} : { employeeId: { in: visible } }) } }),
    db.project.count({ where: { status: "ACTIVE", ...(visible === null ? {} : { memberships: { some: { employeeId: { in: visible }, leftAt: null } } }) } }),
    db.task.count({ where: { status: { notIn: ["DONE", "CANCELLED"] }, ...assignmentFilter } }),
    db.leaveRequest.count({ where: { status: "PENDING", ...(visible === null ? {} : { employeeId: { in: visible } }) } }),
    db.attendanceCorrection.count({ where: { status: "PENDING", ...(visible === null ? {} : { employeeId: { in: visible } }) } }),
    db.project.findMany({ where: { status: "ACTIVE", ...(visible === null ? {} : { memberships: { some: { employeeId: { in: visible }, leftAt: null } } }) }, select: { id: true, name: true, code: true }, orderBy: { updatedAt: "desc" }, take: 4 }),
    db.task.findMany({ where: assignmentFilter, select: { id: true, title: true, status: true, project: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.attendanceSession.groupBy({ by: ["workDate"], where: { workDate: { gte: weekStart, lte: today }, ...(visible === null ? {} : { employeeId: { in: visible } }) }, _count: { _all: true }, orderBy: { workDate: "asc" } }),
  ]);
  const attendanceCountByDay = new Map(weeklyAttendance.map((day) => [day.workDate.toISOString().slice(0, 10), day._count._all]));
  const attendanceDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { date, count: attendanceCountByDay.get(date) ?? 0, label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(day) };
  });
  const attendancePeak = Math.max(1, ...attendanceDays.map((day) => day.count));
  const roles = user?.roles ?? [];
  const isManagement = roles.some((role) => ["OWNER", "HR"].includes(role));
  const isStaff = roles.some((role) => ["STAFF", "INTERN"].includes(role)) && !isManagement;
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: process.env.COMPANY_TIMEZONE ?? "Asia/Kolkata" }).format(new Date());
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: process.env.COMPANY_TIMEZONE ?? "Asia/Kolkata" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return <div>
    <V4PageHeader eyebrow={date} title={`${greeting}, ${user?.employee?.fullName?.split(" ")[0] ?? "there"}`} description={isStaff ? "Your day at a glance. Keep attendance, tasks, and time off in one place." : "A clear view of the people, attendance, and work that need your attention."} actions={isManagement ? <Link href="/workforce/new" className="inline-flex min-h-10 items-center rounded-full bg-[#ff794f] px-4 text-xs font-semibold text-white transition hover:bg-[#f16a40]">+ Add team member</Link> : undefined}/>
    <section aria-label="Workforce summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <V4MetricCard label={isManagement ? "Active employees" : "People in your scope"} value={activeEmployees} caption={isManagement ? "Across your workforce" : "Employees visible to your role"} icon={<Users size={16}/>} />
      <V4MetricCard label={isStaff ? "Your attendance" : "Present today"} value={presentEmployees.length} caption="Employees with an attendance record" icon={<CalendarCheck2 size={16}/>} />
      <V4MetricCard label="On leave today" value={onLeave} caption="Approved leave requests" icon={<Clock3 size={16}/>} />
      <V4MetricCard label="Active projects" value={activeProjects} caption="Projects in your scope" icon={<BriefcaseBusiness size={16}/>} />
      <V4MetricCard label={isStaff ? "My open tasks" : "Pending tasks"} value={openTasks} caption="Work in progress" icon={<CheckCircle2 size={16}/>} />
      <V4MetricCard label={isStaff ? "My pending requests" : "Pending approvals"} value={isStaff ? pendingLeave : pendingLeave + pendingCorrections} caption={isStaff ? "Leave requests waiting for review" : "Leave and attendance decisions"} icon={<Activity size={16}/>} />
    </section>
    <PersonalGoalsSummary />
    <EmploymentCertificates />
    <section className="mt-4 rounded-[18px] border border-[#e8e8e8] bg-white p-4 sm:p-5" aria-labelledby="attendance-chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="attendance-chart-title" className="text-xs font-semibold">Workforce attendance</h2><p className="mt-1 text-[10px] text-[#858585]">Daily attendance sessions over the last seven days</p></div><Link href="/attendance" className="text-[10px] font-semibold text-[#292929]">View attendance ↗</Link></div>
      <div role="img" aria-label={`Attendance sessions by day: ${attendanceDays.map((day) => `${day.label} ${day.count}`).join(", ")}`} className="mt-4 grid h-32 grid-cols-7 items-end gap-2 sm:h-36 sm:gap-4">{attendanceDays.map((day) => <div key={day.date} title={`${day.date}: ${day.count} sessions`} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[9px] text-[#777]">{day.count}</span><div className="flex h-[78%] w-full items-end justify-center rounded-t-md bg-[#f2f2f2]"><div className="w-full max-w-9 rounded-t-md bg-[#292929] transition-[height]" style={{ height: `${Math.max(4, day.count / attendancePeak * 100)}%` }}/></div><span className="text-[9px] text-[#858585]">{day.label}</span></div>)}</div>
    </section>
    <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <div className="overflow-hidden rounded-[18px] border border-[#ececea] bg-white">
        <div className="flex items-center justify-between border-b border-[#f0f0ed] px-4 py-4 sm:px-5"><div><h2 className="text-xs font-semibold">Recent tasks</h2><p className="mt-1 text-[10px] text-[#898989]">Current work across your scope</p></div><Link href="/tasks" className="flex items-center gap-1 text-[10px] font-semibold text-[#c75534]">All tasks <ArrowUpRight size={13}/></Link></div>
        {recentTasks.length ? recentTasks.map((task) => <div key={task.id} className="flex items-center justify-between gap-3 border-b border-[#f6f6f4] px-4 py-3.5 last:border-0 sm:px-5"><div className="min-w-0"><p className="truncate text-[11px] font-semibold">{task.title}</p><p className="mt-1 truncate text-[10px] text-[#898989]">{task.project?.name ?? "General task"}</p></div><V4StatusBadge tone={task.status === "DONE" ? "success" : task.status === "BLOCKED" ? "error" : "neutral"}>{task.status.replaceAll("_", " ")}</V4StatusBadge></div>) : <p className="px-5 py-10 text-center text-xs text-[#898989]">No tasks in scope yet.</p>}
      </div>
      <div className="overflow-hidden rounded-[18px] border border-[#ececea] bg-white">
        <div className="border-b border-[#f0f0ed] px-4 py-4 sm:px-5"><h2 className="text-xs font-semibold">Active projects</h2><p className="mt-1 text-[10px] text-[#898989]">Projects connected to your work</p></div>
        {projects.length ? projects.map((project) => <div key={project.id} className="flex items-center gap-3 border-b border-[#f6f6f4] px-4 py-3.5 last:border-0 sm:px-5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#fff0ea] text-[#e97550]"><BriefcaseBusiness size={15}/></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{project.name}</p><p className="mt-1 text-[9px] text-[#898989]">{project.code}</p></div><Activity size={14} className="text-[#b7b7b0]"/></div>) : <p className="px-5 py-8 text-center text-xs text-[#898989]">No active projects yet.</p>}
        <div className="border-t border-[#f0f0ed] px-5 py-3"><Link href="/projects" className="text-[10px] font-semibold text-[#c75534]">Browse projects →</Link></div>
      </div>
    </section>
    <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-[#ececea] bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff0ea] text-[#e97550]"><Activity size={16}/></span><div><p className="text-[11px] font-semibold">Attendance and work are tracked separately</p><p className="mt-1 text-[10px] text-[#898989]">Your attendance record and task progress each reflect their own activity.</p></div></div>
  </div>;
}
