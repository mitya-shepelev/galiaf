import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getProcessMetrics() {
  const memory = process.memoryUsage();

  return {
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
    },
  };
}

export async function GET() {
  return NextResponse.json({
    service: "employee-cabinet",
    timestamp: new Date().toISOString(),
    process: getProcessMetrics(),
    requiredEnv: {
      apiBaseUrlConfigured: Boolean(process.env.GALIAF_API_BASE_URL),
      chatBaseUrlConfigured: Boolean(process.env.GALIAF_CHAT_BASE_URL),
    },
  });
}
