import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { LeaveBalanceList } from "@/components/leave-balance-list";
import { LeaveRequestActions } from "@/components/leave-request-actions";
import { LeaveRequestDialog } from "@/components/leave-request-dialog";
import { V4MetricCard, V4PageHeader, V4StatusBadge } from "@/components/v4";
import { CalendarDays, Clock3, Plane, WalletCards } from "lucide-react";

export default async function Leave() {
  const user = await currentUser();
  const visible = user ? await visibleEmployeeIds(user) : [];
  const where = visible === null ? {} : { employeeId: { in: visible } };
  const [requests, types] = await Promise.all([
    db.leaveRequest.findMany({ where, select: { id: true, employeeId: true, leaveTypeId: true, startDate: true, endDate: true, status: true, createdAt: true, employee: { select: { fullName: true, employeeCode: true } }, leaveType: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.leaveType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const canReview = Boolean(user?.roles.some((role) => ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role)));
  const canManagePolicy = Boolean(user?.roles.some((role) => ["OWNER", "HR"].includes(role)));

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <V4PageHeader eyebrow="People · Time away" title="Leave management" description="Review balances, request time off, and manage leave in your authorization scope." actions={<>{canManagePolicy && <Link href="/leave/policies" className="inline-flex min-h-10 items-center rounded-full border border-[#ececea] bg-white px-4 text-xs font-semibold text-[#55554f] hover:bg-[#f8f8f6]">Leave policies</Link>}<LeaveRequestDialog types={types}/></>}/>

      <section aria-label="Leave overview" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><V4MetricCard label="Requests in scope" value={requests.length} caption="Recent requests visible to you" icon={<WalletCards size={16}/>} tone="orange"/><V4MetricCard label="Pending requests" value={requests.filter((item) => item.status === "PENDING").length} caption="Awaiting a reviewer decision" icon={<Clock3 size={16}/>} tone="neutral"/><V4MetricCard label="Approved" value={requests.filter((item) => item.status === "APPROVED").length} caption="Approved leave requests" icon={<CalendarDays size={16}/>} tone="blue"/><V4MetricCard label="Upcoming leave" value={requests.filter((item) => item.status === "APPROVED" && item.startDate >= new Date()).length} caption="Approved future requests" icon={<Plane size={16}/>} tone="green"/></section>

      <LeaveBalanceList />

      {types.length === 0 && (
        <section className="mb-5 rounded-[18px] border border-amber-200 bg-amber-50 p-4" role="status">
          <h2 className="text-sm font-semibold text-amber-900">Leave setup is required</h2>
          <p className="mt-1 text-xs text-amber-800">There are no active leave types, so employees cannot submit requests. An Owner or HR administrator can configure leave types and policies.</p>
          {canManagePolicy && <Link href="/leave/policies" className="mt-3 inline-flex min-h-9 items-center rounded-full bg-[#272725] px-4 text-xs font-semibold text-white hover:bg-[#3a3a37]">Configure leave types</Link>}
        </section>
      )}

      <section aria-labelledby="leave-history-title" className="overflow-hidden rounded-[18px] border border-[#ececea] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f0ed] px-4 py-4 sm:px-5">
          <div>
            <h2 id="leave-history-title" className="text-sm font-semibold">Leave request history</h2>
            <p className="mt-1 text-xs text-slate-500">Recent requests and their current review status.</p>
          </div>
          <V4StatusBadge>{requests.length} {requests.length === 1 ? "request" : "requests"}</V4StatusBadge>
        </div>
        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3">Employee</th>
                  <th scope="col" className="px-5 py-3">Leave type</th>
                  <th scope="col" className="px-5 py-3">Dates</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => {
                  const own = user?.employee?.id === request.employeeId;
                  const review = canReview && !own;
                  const cancel = own || canManagePolicy;
                  const statusClass = request.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700"
                    : request.status === "PENDING"
                      ? "bg-amber-50 text-amber-700"
                      : request.status === "REJECTED"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-600";

                  return (
                    <tr key={request.id} className="align-middle transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4"><span className="text-xs font-semibold text-slate-800">{request.employee.fullName}</span><span className="mt-1 block text-[10px] text-slate-400">{request.employee.employeeCode}</span></td>
                      <td className="px-5 py-4 text-xs text-slate-600">{request.leaveType.name}</td>
                      <td className="px-5 py-4 text-xs text-slate-600">{request.startDate.toLocaleDateString()} <span aria-hidden="true">–</span> {request.endDate.toLocaleDateString()}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${statusClass}`}>{request.status}</span></td>
                      <td className="px-5 py-4"><LeaveRequestActions id={request.id} status={request.status} canReview={review} canCancel={cancel} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No leave requests yet</p>
            <p className="mt-1 text-xs text-slate-500">Submitted requests will appear here with their review status.</p>
          </div>
        )}
      </section>
    </div>
  );
}
