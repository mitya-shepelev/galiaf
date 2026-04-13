import {
  type OnApplicationBootstrap,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from "@nestjs/common";
import type { ChatNotificationEvent } from "@galiaf/types";
import { ChatRedisService } from "../platform/chat-redis.service.js";
import {
  ChatNotificationOutboxService,
  type ChatNotificationOutboxRecord,
} from "./chat-notification-outbox.service.js";

export const CHAT_NOTIFICATION_CHANNEL = "galiaf:chat:notifications";

function resolvePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class ChatNotificationDispatcherService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ChatNotificationDispatcherService.name);
  private readonly dispatchIntervalMs: number;
  private readonly batchSize: number;
  private readonly staleDispatchingSeconds: number;
  private readonly maxAttempts: number;
  private timer?: ReturnType<typeof setInterval>;
  private inFlight = false;

  public constructor(
    @Inject(ChatNotificationOutboxService)
    private readonly outbox: ChatNotificationOutboxService,
    @Inject(ChatRedisService)
    private readonly redis: ChatRedisService,
  ) {
    this.dispatchIntervalMs = resolvePositiveIntegerEnv(
      "CHAT_NOTIFICATION_DISPATCH_INTERVAL_MS",
      2000,
    );
    this.batchSize = resolvePositiveIntegerEnv("CHAT_NOTIFICATION_BATCH_SIZE", 100);
    this.staleDispatchingSeconds = resolvePositiveIntegerEnv(
      "CHAT_NOTIFICATION_STALE_SECONDS",
      90,
    );
    this.maxAttempts = resolvePositiveIntegerEnv("CHAT_NOTIFICATION_MAX_ATTEMPTS", 5);
  }

  public async onApplicationBootstrap(): Promise<void> {
    this.timer = setInterval(() => {
      void this.dispatchOnce();
    }, this.dispatchIntervalMs);
    this.timer.unref?.();

    await this.dispatchOnce();
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async dispatchOnce(): Promise<void> {
    if (this.inFlight) {
      return;
    }

    this.inFlight = true;

    try {
      await this.outbox.requeueStaleDispatching(this.staleDispatchingSeconds);

      const records = await this.outbox.claimPending(this.batchSize);

      if (records.length === 0) {
        return;
      }

      for (const record of records) {
        await this.dispatchRecord(record);
      }
    } finally {
      this.inFlight = false;
    }
  }

  private async dispatchRecord(record: ChatNotificationOutboxRecord): Promise<void> {
    const event: ChatNotificationEvent = {
      id: record.id,
      eventType: record.eventType,
      roomId: record.roomId,
      messageId: record.messageId,
      actorSubject: record.actorSubject,
      payload: record.payload,
      createdAt: record.createdAt,
    };

    try {
      await this.redis.publish(CHAT_NOTIFICATION_CHANNEL, JSON.stringify(event));
      await this.outbox.markDispatched(record.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown error";

      await this.outbox.markFailed(record.id, errorMessage, this.maxAttempts);
      this.logger.warn(
        `Notification outbox dispatch failed for ${record.id}: ${errorMessage}`,
      );
    }
  }
}
