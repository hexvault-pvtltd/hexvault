import { db } from "@core/lib/db";
import { NextResponse } from "next/server";
export async function GET() { try { await db.$queryRaw`SELECT 1`; return NextResponse.json({ data: { status: "ready" } }); } catch { return NextResponse.json({ error: { code: "NOT_READY", message: "A required service is unavailable." } }, { status: 503 }); } }
