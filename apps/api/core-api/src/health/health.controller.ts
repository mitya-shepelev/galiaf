import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../auth/auth.decorators.js";
import { DatabaseService } from "../platform/database.service.js";
import { RedisService } from "../platform/redis.service.js";

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
    return {
      status: "ok",
      service: "core-api",
      database: await this.database.healthcheck(),
      redis: await this.redis.healthcheck(),
      timestamp: new Date().toISOString(),
    };
  }
}
