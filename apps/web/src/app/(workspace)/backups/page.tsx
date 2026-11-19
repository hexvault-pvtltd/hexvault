import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { archiveSelect } from "@core/features/backups/service";
import { BackupManager } from "@/components/backup-manager";

export default async function BackupsPage() {
  const user = await currentUser();
  if (!user?.roles.includes("OWNER")) notFound();
  const [history, schedule, company] = await Promise.all([
    db.backupArchive.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: archiveSelect }),
    db.backupSchedule.findUnique({ where: { id: "company" } }),
    db.companySetting.findUnique({ where: { id: "company" }, select: { timezone: true } }),
  ]);
  return <>
    <div className="mb-7"><p className="text-xs text-slate-400">Administration / Backups</p><h1 className="mt-2 text-2xl font-semibold">Backups</h1><p className="mt-1 text-sm text-slate-500">Back up your entire application, download a JSON copy, or restore a previous backup.</p></div>
    <BackupManager timezone={company?.timezone ?? "Asia/Kolkata"} initialHistory={history.map(item => ({ ...item, createdAt: item.createdAt.toISOString(), completedAt: item.completedAt?.toISOString() ?? null }))} initialSchedule={schedule ? { ...schedule, nextRunAt: schedule.nextRunAt?.toISOString() ?? null } : { enabled: false, frequency: "DAILY", timeUtc: "02:00", retention: 30, nextRunAt: null }}/>
  </>;
}
