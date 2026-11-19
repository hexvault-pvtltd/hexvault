import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { personalGoals } from "@core/features/performance/personal-goals";

export async function PersonalGoalsSummary() {
  const actor = await currentUser();
  if (!actor?.employee) return null;
  const goals = await personalGoals(actor, { limit: 5, activeOnly: true });
  return <section aria-labelledby="personal-goals-heading" className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-start justify-between gap-4"><div><h2 id="personal-goals-heading" className="text-sm font-semibold">My goals</h2><p className="mt-1 text-xs text-slate-500">Your active goals, including those assigned by your manager.</p></div><Link href="/my-goals" className="shrink-0 text-xs font-semibold text-violet-700 hover:underline">View all</Link></div>
    {goals.length ? <div className="mt-3 divide-y divide-slate-100">{goals.map(goal => <article key={goal.id} className="py-3"><Link href={`/my-goals#goal-${goal.id}`} className="text-xs font-semibold hover:underline">{goal.title}</Link>{goal.targetDate && <p className="mt-1 text-[10px] text-slate-400">Target {goal.targetDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>}{goal.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{goal.description}</p>}{goal.progressNote && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">Progress: {goal.progressNote}</p>}</article>)}</div> : <p className="mt-4 text-xs text-slate-500">No active goals yet. <Link href="/my-goals" className="font-semibold text-violet-700 hover:underline">Open My goals</Link> to create one or see completed goals.</p>}
  </section>;
}
