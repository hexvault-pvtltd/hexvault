import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { organizationData } from "@core/features/organization/service";
import { OrganizationChartView } from "@/components/organization-chart";

export default async function OrganizationChart() {
  const actor = await currentUser();
  if (!actor) notFound();
  const data = await organizationData(actor);
  return <div className="mx-auto w-full max-w-7xl">
    <header className="mb-6"><p className="text-xs text-slate-400">People / Organization</p><h1 className="mt-2 text-2xl font-semibold">Organization chart</h1><p className="mt-1 text-sm text-slate-500">Explore the reporting structure and follow each employee&apos;s place in the organization.</p></header>
    <OrganizationChartView employees={data.employees} initialRelationships={data.relationships} initialOutsideView={data.outsideView} total={data.total} truncated={data.truncated} canManage={actor.roles.some(role => ["OWNER", "HR"].includes(role))}/>
  </div>;
}
