import { notFound } from "next/navigation";
import { currentUser } from "@core/lib/auth";
import { StorageOptimizer } from "@/components/storage-optimizer";

export default async function StoragePage() {
  const user = await currentUser();
  if (!user?.roles.includes("OWNER")) notFound();
  return <><div className="mb-7"><p className="text-xs text-slate-400">Administration / Storage</p><h1 className="mt-2 text-2xl font-semibold">Storage</h1><p className="mt-1 text-sm text-slate-500">Reduce stored file sizes while preserving your originals.</p></div><StorageOptimizer/></>;
}
