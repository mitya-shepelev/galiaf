import { Controller, Get, Inject } from "@nestjs/common";
import { ChatMessageStoreService } from "../messages/chat-message-store.service.js";
import { ChatNotificationOutboxService } from "../notifications/chat-notification-outbox.service.js";
import { ChatDatabaseService } from "../platform/chat-database.service.js";
import { ChatRedisService } from "../platform/chat-redis.service.js";
import { ChatStateService } from "../state/chat-state.service.js";

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
    @Inject(ChatDatabaseService)
    private readonly database: ChatDatabaseService,
    @Inject(ChatMessageStoreService)
    private readonly messages: ChatMessageStoreService,
    @Inject(ChatNotificationOutboxService)
    private readonly notificationOutbox: ChatNotificationOutboxService,
    @Inject(ChatRedisService)
    private readonly redis: ChatRedisService,
    @Inject(ChatStateService)
    private readonly chatState: ChatStateService,
  ) {}

  @Get()
  public async getMetrics() {
    const [database, redis, stats, outbox] = await Promise.all([
      this.database.healthcheck(),
      this.redis.healthcheck(),
      this.messages.getStats(),
      this.notificationOutbox.getStats(),
    ]);

    return {
      service: "chat",
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
      process: getProcessMetrics(),
      realtime: {
        ...this.chatState.getSnapshot(),
      },
      storage: {
        persistedMessages: stats.messages,
        persistedRooms: stats.rooms,
      },
      notificationOutbox: outbox,
    };
  }
}
