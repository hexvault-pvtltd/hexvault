import { currentUser } from "@core/lib/auth";
import { FormerMemberAccessError, listFormerMembers } from "@core/features/employees/former-members";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).max(10_000).default(0) }).strict();

export async function GET(request: NextRequest) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!query.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid page parameters." } }, { status: 422 });
  try {
    const { items, total } = await listFormerMembers(actor, query.data.limit, query.data.offset);
    return ok({ items, total, limit: query.data.limit, offset: query.data.offset });
  } catch (error) {
    if (error instanceof FormerMemberAccessError) return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: error.status });
    return fail(error);
  }
}
