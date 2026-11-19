import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { personalGoals } from "@core/features/performance/personal-goals";
import { PerformanceWorkbench } from "@/components/performance-workbench";

export default async function MyGoals() {
  const actor = await currentUser();
  if (!actor) notFound();
  const goals = await personalGoals(actor);
  return <div className="mx-auto w-full max-w-5xl">
    <header className="mb-5"><p className="text-xs text-slate-400">Personal / My goals</p><h1 className="mt-2 text-2xl font-semibold">My goals</h1><p className="mt-1 text-sm text-slate-500">Your goals and progress, including goals assigned to you by your manager.</p></header>
    {actor.employee ? <PerformanceWorkbench reviews={[]} goals={goals.map(goal => ({ ...goal, targetDate: goal.targetDate?.toISOString() ?? null }))} people={[{ id: actor.employee.id, fullName: actor.employee.fullName, employeeCode: actor.employee.employeeCode }]} ownEmployeeId={actor.employee.id} canManage={false} section="goals"/> : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Your account is not linked to an employee profile yet. Contact your workspace administrator to access personal goals.</p>}
  </div>;
}
