import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const requiredEnvVars = [
  "GALIAF_API_BASE_URL",
  "GALIAF_PUBLIC_SITE_URL",
  "GALIAF_ADMIN_PORTAL_URL",
  "GALIAF_MANAGER_CABINET_URL",
  "GALIAF_EMPLOYEE_CABINET_URL",
] as const;

export async function GET() {
  const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
  const ready = missingEnvVars.length === 0;

  return NextResponse.json(
    {
      status: ready ? "ok" : "error",
      service: "public-site",
      kind: "readiness",
      ready,
      missingEnvVars,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
    },
  );
}
