import { Controller, Get, Inject } from "@nestjs/common";
import { AuthConfigService } from "../auth/auth-config.service.js";
import { ChatMessageStoreService } from "../messages/chat-message-store.service.js";
import { ChatDatabaseService } from "../platform/chat-database.service.js";
import { ChatRedisService } from "../platform/chat-redis.service.js";
import { ChatStateService } from "../state/chat-state.service.js";

@Controller("health")
export class HealthController {
  public constructor(
    @Inject(AuthConfigService)
    private readonly authConfig: AuthConfigService,
    @Inject(ChatDatabaseService)
    private readonly database: ChatDatabaseService,
    @Inject(ChatMessageStoreService)
    private readonly messages: ChatMessageStoreService,
    @Inject(ChatRedisService)
    private readonly redis: ChatRedisService,
    @Inject(ChatStateService)
    private readonly chatState: ChatStateService,
  ) {}

  @Get()
  public async check() {
    return {
      status: "ok",
      service: "chat",
      transport: "socket.io",
      authMode: this.authConfig.getMode(),
      database: await this.database.healthcheck(),
      redis: await this.redis.healthcheck(),
      connections: this.chatState.getConnectionCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("snapshot")
  public async snapshot() {
    const stats = await this.messages.getStats();

    return {
      status: "ok",
      service: "chat",
      database: await this.database.healthcheck(),
      redis: await this.redis.healthcheck(),
      persistedMessages: stats.messages,
      persistedRooms: stats.rooms,
      ...this.chatState.getSnapshot(),
      timestamp: new Date().toISOString(),
    };
  }
}
