import { Controller, Get, Inject, Res } from "@nestjs/common";
import { Public } from "../auth/auth.decorators.js";
import { DatabaseService } from "../platform/database.service.js";
import { RedisService } from "../platform/redis.service.js";

interface PassthroughReply {
  status(code: number): unknown;
}

function resolveStatus(
  database: "ok" | "error",
  redis: "ok" | "error",
): "ok" | "error" {
  return database === "ok" && redis === "ok" ? "ok" : "error";
}

@Controller("health")
export class HealthController {
  public constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(RedisService)
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  public async check() {
    const database = await this.database.healthcheck();
    const redis = await this.redis.healthcheck();

    return {
      status: resolveStatus(database, redis),
      service: "core-api",
      kind: "snapshot",
      ready: resolveStatus(database, redis) === "ok",
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get("live")
  public async live() {
    return {
      status: "ok",
      service: "core-api",
      kind: "liveness",
      ready: true,
      database: "ok",
      redis: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get("ready")
  public async ready(@Res({ passthrough: true }) response: PassthroughReply) {
    const database = await this.database.healthcheck();
    const redis = await this.redis.healthcheck();
    const status = resolveStatus(database, redis);

    response.status(status === "ok" ? 200 : 503);

    return {
      status,
      service: "core-api",
      kind: "readiness",
      ready: status === "ok",
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }
}
