import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { NotificationRead } from "@/components/notification-read";

export default async function Notifications() {
  const user = await currentUser();
  const items = await db.notification.findMany({ where: { recipientUserId: user!.id }, orderBy: { createdAt: "desc" }, take: 100 });

  return <>
    <div className="mb-7">
      <p className="text-xs text-slate-400">Workspace / Notifications</p>
      <h1 className="mt-2 text-2xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm text-slate-500">Updates addressed to your account.</p>
    </div>
    <div className="rounded-xl border border-slate-200 bg-white">
      {items.length ? items.map(item => {
        const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
          ? item.payload as { employeeId?: unknown; employeeName?: unknown; email?: unknown }
          : {};
        const passwordReset = item.type === "PASSWORD_RESET_REQUESTED";
        const employeeId = typeof payload.employeeId === "string" ? payload.employeeId : null;
        const employeeName = typeof payload.employeeName === "string" ? payload.employeeName : null;
        const email = typeof payload.email === "string" ? payload.email : null;

        return <article key={item.id} className={`flex flex-wrap items-start justify-between gap-4 border-b border-slate-50 px-5 py-4 last:border-0 ${item.readAt ? "" : "bg-violet-50/30"}`}>
          <div className="min-w-0">
            <p className="text-xs font-semibold">{passwordReset ? "Password reset requested" : item.type.replaceAll("_", " ")}</p>
            {passwordReset
              ? <p className="mt-1 text-xs text-slate-600">{employeeName ?? email ?? "An account"} requested help changing their password.</p>
              : <p className="mt-1 break-all text-xs text-slate-600">{JSON.stringify(item.payload)}</p>}
            <p className="mt-2 text-[10px] text-slate-400">{item.createdAt.toLocaleString()}</p>
            {passwordReset && employeeId && <Link href={`/workforce/${employeeId}`} className="mt-3 inline-flex rounded-lg bg-[#f46327] px-3 py-2 text-[10px] font-semibold text-white">Review and set password</Link>}
            {passwordReset && !employeeId && <p className="mt-2 text-[10px] text-amber-700">This account is not linked to an employee profile. Contact an Owner to update it.</p>}
          </div>
          {!item.readAt && <NotificationRead id={item.id} />}
        </article>;
      }) : <p className="px-5 py-14 text-center text-xs text-slate-400">You’re all caught up.</p>}
    </div>
  </>;
}
