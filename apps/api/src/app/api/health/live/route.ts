import { ok } from "@core/lib/http";
export async function GET() { return ok({ status: "live", time: new Date().toISOString() }); }
