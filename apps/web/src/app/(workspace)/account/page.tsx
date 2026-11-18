import { currentUser } from "@core/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import Link from "next/link";

export default async function Account() {
  const user = await currentUser();
  return <>
    <div className="mb-6">
      <p className="text-xs text-slate-400">My account</p>
      <h1 className="mt-2 text-2xl font-semibold">Account profile</h1>
    </div>
    <section aria-label="Account profile details" className="w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs text-slate-400">Name</p><p className="mt-1.5 break-words text-sm font-semibold">{user?.employee?.fullName ?? "—"}</p></div>
        <div><p className="text-xs text-slate-400">Work email</p><p className="mt-1.5 break-all text-sm font-semibold">{user?.email}</p></div>
        <div><p className="text-xs text-slate-400">Employee code</p><p className="mt-1.5 break-words text-sm font-semibold">{user?.employee?.employeeCode ?? "—"}</p></div>
        <div><p className="text-xs text-slate-400">Roles</p><div className="mt-2 flex flex-wrap gap-2">{user?.roles.map((role) => <span key={role} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{role.replaceAll("_", " ")}</span>)}</div></div>
      </div>
      <div className="mt-7 border-t border-slate-100 pt-5"><Link href="/security/sessions" className="text-xs font-semibold text-[#292929]">Review active sessions →</Link></div>
    </section>
    <section aria-labelledby="change-password-heading" className="mt-5 w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 id="change-password-heading" className="text-sm font-semibold">Change password</h2>
      <p className="mt-1 text-xs text-slate-500">Verify your current password, then choose and confirm a new password.</p>
      <ChangePasswordForm />
    </section>
  </>;
}
