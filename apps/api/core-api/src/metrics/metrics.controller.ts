import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../auth/auth.decorators.js";
import { DatabaseService } from "../platform/database.service.js";
import { RedisService } from "../platform/redis.service.js";

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

@Controller("metrics")
export class MetricsController {
  public constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(RedisService)
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  public async getMetrics() {
    const [database, redis, counts] = await Promise.all([
      this.database.healthcheck(),
      this.redis.healthcheck(),
      this.database.query<{
        organizations: string;
        users: string;
        memberships: string;
        invitations: string;
      }>(`
        select
          (select count(*)::text from organizations) as organizations,
          (select count(*)::text from users) as users,
          (select count(*)::text from memberships) as memberships,
          (select count(*)::text from invitations) as invitations
      `),
    ]);

    const snapshot = counts.rows[0];

    return {
      service: "core-api",
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
      process: getProcessMetrics(),
      domain: {
        organizations: Number(snapshot?.organizations ?? "0"),
        users: Number(snapshot?.users ?? "0"),
        memberships: Number(snapshot?.memberships ?? "0"),
        invitations: Number(snapshot?.invitations ?? "0"),
      },
    };
  }
}
