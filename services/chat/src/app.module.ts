import { Module } from "@nestjs/common";
import { AuthConfigService } from "./auth/auth-config.service.js";
import { IdentityResolverService } from "./auth/identity-resolver.service.js";
import { ChatGateway } from "./gateway/chat.gateway.js";
import { HealthController } from "./health/health.controller.js";
import { MetricsController } from "./metrics/metrics.controller.js";
import { ChatAuthController } from "./auth/chat-auth.controller.js";
import { ChatMessageStoreService } from "./messages/chat-message-store.service.js";
import { ChatNotificationDispatcherService } from "./notifications/chat-notification-dispatcher.service.js";
import { ChatNotificationOutboxService } from "./notifications/chat-notification-outbox.service.js";
import { ChatDatabaseService } from "./platform/chat-database.service.js";
import { ChatRedisService } from "./platform/chat-redis.service.js";
import { ChatRealtimeService } from "./realtime/chat-realtime.service.js";
import { ChatStateService } from "./state/chat-state.service.js";

@Module({
  controllers: [HealthController, MetricsController, ChatAuthController],
  providers: [
    AuthConfigService,
    IdentityResolverService,
    ChatDatabaseService,
    ChatRedisService,
    ChatRealtimeService,
    ChatMessageStoreService,
    ChatNotificationOutboxService,
    ChatNotificationDispatcherService,
    ChatStateService,
    ChatGateway,
  ],
})
export class AppModule {}
