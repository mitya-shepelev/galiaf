import { Controller, Get, Inject, Res } from "@nestjs/common";
import { AuthConfigService } from "../auth/auth-config.service.js";
import { ChatMessageStoreService } from "../messages/chat-message-store.service.js";
import { ChatNotificationOutboxService } from "../notifications/chat-notification-outbox.service.js";
import { ChatDatabaseService } from "../platform/chat-database.service.js";
import { ChatRedisService } from "../platform/chat-redis.service.js";
import { ChatStateService } from "../state/chat-state.service.js";

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
    @Inject(AuthConfigService)
    private readonly authConfig: AuthConfigService,
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
  public async check() {
    const database = await this.database.healthcheck();
    const redis = await this.redis.healthcheck();
    const status = resolveStatus(database, redis);

    return {
      status,
      service: "chat",
      kind: "snapshot",
      ready: status === "ok",
      transport: "socket.io",
      authMode: this.authConfig.getMode(),
      database,
      redis,
      connections: this.chatState.getConnectionCount(),
      notificationOutbox: await this.notificationOutbox.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("live")
  public async live() {
    return {
      status: "ok",
      service: "chat",
      kind: "liveness",
      ready: true,
      database: "ok",
      redis: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  public async ready(@Res({ passthrough: true }) response: PassthroughReply) {
    const database = await this.database.healthcheck();
    const redis = await this.redis.healthcheck();
    const status = resolveStatus(database, redis);

    response.status(status === "ok" ? 200 : 503);

    return {
      status,
      service: "chat",
      kind: "readiness",
      ready: status === "ok",
      transport: "socket.io",
      authMode: this.authConfig.getMode(),
      database,
      redis,
      connections: this.chatState.getConnectionCount(),
      notificationOutbox: await this.notificationOutbox.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("snapshot")
  public async snapshot() {
    const stats = await this.messages.getStats();
    const database = await this.database.healthcheck();
    const redis = await this.redis.healthcheck();
    const status = resolveStatus(database, redis);

    return {
      status,
      service: "chat",
      kind: "snapshot",
      ready: status === "ok",
      database,
      redis,
      persistedMessages: stats.messages,
      persistedRooms: stats.rooms,
      notificationOutbox: await this.notificationOutbox.getStats(),
      ...this.chatState.getSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }
}
