import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { archiveSelect } from "@core/features/backups/service";
import { BackupManager } from "@/components/backup-manager";

export default async function BackupsPage() {
  const user = await currentUser();
  if (!user?.roles.includes("OWNER")) notFound();
  const data = await Promise.all([
    db.backupArchive.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: archiveSelect }),
    db.backupSchedule.findUnique({ where: { id: "company" } }),
    db.companySetting.findUnique({ where: { id: "company" }, select: { timezone: true } }),
  ]).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError
      && ["P2021", "P2022"].includes(error.code)
      && ["BackupArchive", "BackupSchedule"].includes(String(error.meta?.modelName))) {
      console.error("backups_schema_not_ready", { code: error.code, model: error.meta?.modelName });
      return null;
    }
    throw error;
  });
  if (!data) return <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
    <h1 className="text-lg font-semibold">Backups need a database update</h1>
    <p className="mt-2 text-sm">The backup database tables are not ready. Apply the pending database migrations on the server, then reload this page.</p>
    <p className="mt-2 text-sm">Your existing application data has not been changed.</p>
    <a href="/backups" className="mt-4 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white">Reload backups</a>
  </section>;
  const [history, schedule, company] = data;
  return <>
    <div className="mb-7"><p className="text-xs text-slate-400">Administration / Backups</p><h1 className="mt-2 text-2xl font-semibold">Backups</h1><p className="mt-1 text-sm text-slate-500">Back up your entire application, download a JSON copy, or restore a previous backup.</p></div>
    <BackupManager timezone={company?.timezone ?? "Asia/Kolkata"} initialHistory={history.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), completedAt: item.completedAt?.toISOString() ?? null }))} initialSchedule={schedule ? { ...schedule, nextRunAt: schedule.nextRunAt?.toISOString() ?? null } : { enabled: false, frequency: "DAILY", timeUtc: "02:00", retention: 30, nextRunAt: null }}/>
  </>;
}
