import { Module } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { RedisService } from "./redis.service.js";

@Module({
  providers: [DatabaseService, RedisService],
  exports: [DatabaseService, RedisService],
})
export class PlatformModule {}
