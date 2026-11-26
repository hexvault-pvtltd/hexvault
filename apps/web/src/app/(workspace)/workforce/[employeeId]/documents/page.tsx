import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { canUploadForEmployee } from "@core/features/documents/permissions";
import { EmployeeDocuments } from "@/components/employee-documents";

export default async function EmployeeDocumentsPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const actor = await currentUser();
  const { employeeId } = await params;
  if (!actor || !canUploadForEmployee(actor, employeeId)) notFound();
  const employee = await db.employee.findUnique({ where: { id: employeeId }, select: { id: true, fullName: true, employeeCode: true } });
  if (!employee) notFound();
  const owner = actor.roles.includes("OWNER");
  const hr = actor.roles.includes("HR");
  const isSelf = actor.employee?.id === employeeId;
  return <><div className="mb-7"><p className="text-xs text-slate-400"><Link href={`/workforce/${employeeId}`} className="hover:text-slate-700">{employee.fullName}</Link> / Documents</p><h1 className="mt-2 text-2xl font-semibold">Employee documents</h1><p className="mt-1 text-sm text-slate-500">{employee.employeeCode} · Private files are access-controlled and validated before use.</p></div><EmployeeDocuments employeeId={employeeId} canUpload={owner||hr||isSelf} canSetVisibility={owner||hr} owner={owner} hr={hr} isSelf={isSelf}/></>;
}
