import Link from "next/link";
import { currentUser } from "@core/lib/auth";
import { searchWorkspace } from "@core/features/search";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await currentUser();
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const results = user && query.length >= 2 ? await searchWorkspace(user, query) : { employees: [], tasks: [], projects: [] };
  const { employees, tasks, projects } = results;
  const sections = [
    { title: "People", rows: employees.map(person => <Link key={person.id} href={`/workforce/${person.id}`} className="block border-b border-slate-50 px-4 py-3 text-xs hover:bg-slate-50"><b>{person.fullName}</b><p className="mt-1 text-[10px] text-slate-400">{person.employeeCode} · {person.title ?? "Employee"}</p></Link>) },
    { title: "Tasks", rows: tasks.map(task => <div key={task.id} className="border-b border-slate-50 px-4 py-3 text-xs"><b>{task.title}</b><p className="mt-1 text-[10px] text-slate-400">{task.status}</p></div>) },
    { title: "Projects", rows: projects.map(project => <div key={project.id} className="border-b border-slate-50 px-4 py-3 text-xs"><b>{project.name}</b><p className="mt-1 text-[10px] text-slate-400">{project.status}</p></div>) },
  ];
  return <>
    <div className="mb-7"><p className="text-xs text-slate-400">Search</p><h1 className="mt-2 text-2xl font-semibold">Results for “{query}”</h1></div>
    {query.length < 2 ? <p className="text-sm text-slate-500">Enter at least two characters to search.</p> : <div className="grid gap-5 lg:grid-cols-3">{sections.map(section => <section key={section.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h2 className="border-b border-slate-100 px-4 py-3 text-xs font-semibold">{section.title}</h2>{section.rows.length ? section.rows : <p className="px-4 py-8 text-center text-xs text-slate-400">No matches.</p>}</section>)}</div>}
  </>;
}
