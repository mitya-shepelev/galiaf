import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;

  public async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? "redis://:1234@127.0.0.1:6379";

    this.client = createClient({ url });
    this.client.on("error", (error) =>
      this.logger.error(`Redis error: ${error.message}`),
    );

    await this.client.connect();
    this.logger.log("Redis connection established.");
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  public async healthcheck(): Promise<"ok" | "error"> {
    try {
      return (await this.client.ping()) === "PONG" ? "ok" : "error";
    } catch {
      return "error";
    }
  }
}
