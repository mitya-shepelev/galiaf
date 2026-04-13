import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "employee-cabinet",
    kind: "liveness",
    ready: true,
    timestamp: new Date().toISOString(),
  });
}
