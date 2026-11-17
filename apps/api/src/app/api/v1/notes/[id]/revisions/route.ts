import { currentUser } from "@core/lib/auth";
import { listOwnerNoteRevisions, ManagementNoteError } from "@core/features/management-notes/service";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id } = await params;
    return ok({ items: await listOwnerNoteRevisions(id, actor.id) });
  } catch (error) {
    if (error instanceof ManagementNoteError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return fail(error);
  }
}
