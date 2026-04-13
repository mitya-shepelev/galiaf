import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

@Injectable()
export class ChatRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRedisService.name);
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

  public duplicate(): RedisClientType {
    return this.client.duplicate();
  }

  public async publish(channel: string, payload: string): Promise<void> {
    await this.client.publish(channel, payload);
  }

  public async touchRoomParticipant(
    roomId: string,
    socketId: string,
    expiresAtEpochMs: number,
  ): Promise<void> {
    const key = this.getRoomParticipantsKey(roomId);

    await this.client.zAdd(key, {
      score: expiresAtEpochMs,
      value: socketId,
    });
  }

  public async countRoomParticipants(
    roomId: string,
    nowEpochMs: number,
  ): Promise<number> {
    const key = this.getRoomParticipantsKey(roomId);

    await this.pruneExpiredRoomParticipants(roomId, nowEpochMs);

    return this.client.zCard(key);
  }

  public async removeRoomParticipant(roomId: string, socketId: string): Promise<void> {
    const key = this.getRoomParticipantsKey(roomId);

    await this.client.zRem(key, socketId);
  }

  public async pruneExpiredRoomParticipants(
    roomId: string,
    nowEpochMs: number,
  ): Promise<void> {
    const key = this.getRoomParticipantsKey(roomId);

    await this.client.zRemRangeByScore(key, 0, nowEpochMs);
  }

  private getRoomParticipantsKey(roomId: string): string {
    return `galiaf:chat:room:${encodeURIComponent(roomId)}:participants`;
  }
}
