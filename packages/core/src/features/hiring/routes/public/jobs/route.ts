import { fail, ok } from "@core/lib/http";
import { publicJobCatalog } from "@core/features/hiring/public-catalog";

export async function GET() {
  try {
    const items = await publicJobCatalog();
    return ok({ items });
  } catch (error) { return fail(error); }
}
