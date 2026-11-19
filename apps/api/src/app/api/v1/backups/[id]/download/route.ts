import { downloadBackup } from "@core/features/backups/handlers";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return downloadBackup((await params).id);
}
