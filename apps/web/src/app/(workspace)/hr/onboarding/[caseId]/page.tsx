import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";
import { canUploadForEmployee } from "@core/features/documents/permissions";
import { ChecklistCompleteButton } from "@/components/lifecycle-actions";
import { EmployeeDocuments } from "@/components/employee-documents";

export default async function OnboardingDetail({ params }: { params: Promise<{ caseId: string }> }) {
  const actor = await currentUser();
  if (!actor) notFound();
  const { caseId } = await params;
  const item = await db.onboardingCase.findUnique({ where: { id: caseId }, include: { employee: true, items: true } });
  if (!item) notFound();
  const visible = await visibleEmployeeIds(actor);
  if (visible !== null && !visible.includes(item.employeeId)) notFound();
  const owner = actor.roles.includes("OWNER");
  const hr = actor.roles.includes("HR");
  const documentsAllowed = canUploadForEmployee(actor, item.employeeId);
  const completed = item.items.filter(check => check.status === "COMPLETE").length;

  return <div className="space-y-6">
    <header>
      <p className="text-xs text-slate-400"><Link href="/hr/onboarding" className="hover:text-slate-600">Onboarding</Link> / Case</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{item.employee.fullName}</h1><p className="mt-1 text-sm text-slate-500">{item.employee.employeeCode} &middot; {item.status}{item.dueAt ? " \u00b7 Due " + item.dueAt.toLocaleDateString() : ""}</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/workforce/" + item.employeeId} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold">Employee profile</Link>
          {(owner || hr) && <Link href={"/workforce/" + item.employeeId + "/edit"} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold">Edit employee</Link>}
          {documentsAllowed && <a href="#documents" className="rounded-lg bg-[#f46327] px-4 py-2 text-xs font-semibold text-white">Add documents</a>}
        </div>
      </div>
    </header>
    <section aria-labelledby="checklist-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><h2 id="checklist-heading" className="text-sm font-semibold">Onboarding checklist</h2><p className="text-xs text-slate-500">{completed} of {item.items.length} complete</p></div>
      {item.items.map(check => <div key={check.id} className="flex items-center justify-between gap-4 border-b border-slate-50 px-5 py-4 last:border-0"><div><p className="text-xs font-medium">{check.title}</p><p className="mt-1 text-[10px] text-slate-400">{check.status}{check.completedAt ? " \u00b7 Completed " + check.completedAt.toLocaleDateString() : ""}</p></div>{check.status !== "COMPLETE" && item.status !== "COMPLETE" && <ChecklistCompleteButton apiPath={"/api/v1/onboarding/" + caseId + "/items/" + check.id + "/complete"} />}</div>)}
    </section>
    {documentsAllowed && <section id="documents" aria-labelledby="documents-heading" className="scroll-mt-24 space-y-4">
      <div><h2 id="documents-heading" className="text-lg font-semibold">Documents for {item.employee.fullName}</h2><p className="mt-1 text-sm text-slate-500">Upload identity records, contracts, and certificates here. These files also appear in the employee&apos;s profile documents.</p></div>
      <EmployeeDocuments employeeId={item.employeeId} canUpload canSetVisibility={owner || hr} owner={owner} hr={hr} isSelf={actor.employee?.id === item.employeeId} />
    </section>}
  </div>;
}
