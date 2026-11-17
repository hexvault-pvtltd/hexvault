import { redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { ManagementNotes } from "@/components/management-notes";

export default async function EmployeeNotesPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("OWNER")) redirect("/dashboard");
  const { employeeId } = await params;
  return <ManagementNotes employeeId={employeeId} />;
}
