import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";

export default async function HrDocumentsPage() {
  const actor = await currentUser();
  if (!actor?.roles.some(role => ["OWNER", "HR"].includes(role))) redirect("/dashboard");
  const owner = actor.roles.includes("OWNER");
  const items = await db.employeeDocument.findMany({
    where: owner ? {} : { visibility: { not: "OWNER" } },
    include: { employee: { select: { id: true, employeeCode: true, fullName: true } }, currentFile: { select: { originalFilename: true, mimeType: true, sizeBytes: true, scanStatus: true } } },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  if (items.length) await db.documentAccessEvent.createMany({ data: items.map(item => ({ documentId: item.id, actorId: actor.id, action: "HR_INDEX_VIEWED" })) });
  return <><div className="mb-7"><p className="text-xs text-slate-400">HR operations / Documents</p><h1 className="mt-2 text-2xl font-semibold">Employee documents</h1><p className="mt-1 text-sm text-slate-500">Private file metadata available to your role; downloads are checked again at access time.</p></div><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="grid grid-cols-[1.1fr_1fr_1.2fr_.8fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span>Employee</span><span>Category</span><span>File</span><span>Visibility / status</span></div>{items.length?items.map(item=><Link key={item.id} href={`/workforce/${item.employee.id}/documents`} className="grid grid-cols-[1.1fr_1fr_1.2fr_.8fr] items-center gap-4 border-b border-slate-50 px-5 py-4 last:border-0 hover:bg-slate-50"><span><b className="block text-xs">{item.employee.fullName}</b><small className="text-[10px] text-slate-400">{item.employee.employeeCode}</small></span><span className="text-xs">{item.category}</span><span className="truncate text-xs text-slate-600">{item.currentFile.originalFilename}</span><span className="text-[10px] text-slate-500">{item.visibility} · {item.currentFile.scanStatus}</span></Link>):<p className="px-5 py-12 text-center text-xs text-slate-400">No employee documents have been added.</p>}</section></>;
}
