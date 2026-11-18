import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { listFormerMembers } from "@core/features/employees/former-members";

export default async function FormerMembers() {
  const actor = await currentUser();
  if (!actor || !actor.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) notFound();
  const { items } = await listFormerMembers(actor, 100);
  return <div className="mx-auto w-full max-w-[1360px]"><div className="mb-6"><p className="text-xs text-slate-400">People · Historical records</p><h1 className="mt-2 text-2xl font-semibold">Former members</h1><p className="mt-1 text-sm text-slate-500">Employment history remains linked to each original employee record.</p></div><section className="overflow-hidden rounded-[18px] border border-[#ececea] bg-white" aria-label="Former members">{items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Employee</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Last day</th><th className="px-5 py-3">History</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item => <tr key={item.id}><td className="px-5 py-4"><Link className="text-xs font-semibold text-slate-800 hover:text-[#d94e1d]" href={`/former-members/${item.id}`}>{item.fullName}</Link><span className="mt-1 block text-[10px] text-slate-400">{item.employeeCode}{item.title ? ` · ${item.title}` : ""}</span></td><td className="px-5 py-4 text-xs text-slate-600">{item.department?.name ?? "—"}</td><td className="px-5 py-4 text-xs text-slate-600">{item.periods[0]?.endDate?.toLocaleDateString() ?? "Not recorded"}</td><td className="px-5 py-4"><Link className="text-xs font-semibold text-[#bd4b2b]" href={`/former-members/${item.id}`}>View record</Link></td></tr>)}</tbody></table></div> : <p className="px-5 py-14 text-center text-xs text-slate-500">No former members are available in your scope.</p>}</section></div>;
}
