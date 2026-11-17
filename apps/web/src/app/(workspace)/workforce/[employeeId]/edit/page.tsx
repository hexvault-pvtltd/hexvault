import { redirect } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { EmployeeEditForm } from "@/components/employee-edit-form";

export default async function EditEmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.roles.some(role => ["OWNER", "HR"].includes(role))) redirect("/dashboard");
  const { employeeId } = await params;
  return <EmployeeEditForm employeeId={employeeId} />;
}
