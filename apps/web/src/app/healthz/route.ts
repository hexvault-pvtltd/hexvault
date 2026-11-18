import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "live", service: "hexvault-web", time: new Date().toISOString() });
}
