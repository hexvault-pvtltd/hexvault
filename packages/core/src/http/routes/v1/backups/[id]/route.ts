import { deleteBackup } from "@core/features/backups/handlers";
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return deleteBackup((await params).id);
}
