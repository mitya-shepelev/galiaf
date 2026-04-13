import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Inject, Logger } from "@nestjs/common";
import type { ChatPresenceEvent, RequestIdentity } from "@galiaf/types";
import type { Server, Socket } from "socket.io";
import { IdentityResolverService } from "../auth/identity-resolver.service.js";
import { ChatMessageStoreService } from "../messages/chat-message-store.service.js";
import { ChatRedisService } from "../platform/chat-redis.service.js";
import { ChatRealtimeService } from "../realtime/chat-realtime.service.js";
import { ChatStateService } from "../state/chat-state.service.js";

interface ChatMessagePayload {
  roomId: string;
  text: string;
}

interface ChatMessageReceiptPayload {
  messageId: string;
}

type AuthenticatedSocket = Socket & {
  data: {
    identity?: RequestIdentity;
    heartbeatTimer?: ReturnType<typeof setInterval>;
  };
};

function resolvePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@WebSocketGateway({
  namespace: "/chat",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements
    OnGatewayConnection<AuthenticatedSocket>,
    OnGatewayDisconnect<AuthenticatedSocket>
{
  private readonly logger = new Logger(ChatGateway.name);
  private readonly presenceTtlMs: number;
  private readonly presenceHeartbeatMs: number;

  @WebSocketServer()
  private server!: Server;

  public constructor(
    @Inject(IdentityResolverService)
    private readonly identityResolver: IdentityResolverService,
    @Inject(ChatMessageStoreService)
    private readonly messages: ChatMessageStoreService,
    @Inject(ChatRedisService)
    private readonly redis: ChatRedisService,
    @Inject(ChatRealtimeService)
    private readonly realtime: ChatRealtimeService,
    @Inject(ChatStateService)
    private readonly chatState: ChatStateService,
  ) {
    const ttlSeconds = resolvePositiveIntegerEnv("CHAT_PRESENCE_TTL_SECONDS", 45);
    const heartbeatSeconds = resolvePositiveIntegerEnv(
      "CHAT_PRESENCE_HEARTBEAT_SECONDS",
      15,
    );

    this.presenceTtlMs = ttlSeconds * 1000;
    this.presenceHeartbeatMs = Math.max(
      1000,
      Math.min(heartbeatSeconds * 1000, Math.max(1000, this.presenceTtlMs - 1000)),
    );

    this.realtime.registerConsumer((event) => {
      if (!this.server) {
        return;
      }

      if (event.kind === "message") {
        this.server.to(event.roomId).emit("chat:message", event.payload);
        return;
      }

      if (event.kind === "message-updated") {
        this.server.to(event.roomId).emit("chat:message-updated", event.payload);
        return;
      }

      this.server.to(event.roomId).emit("chat:presence", event.payload);
    });
  }

  public async handleConnection(client: AuthenticatedSocket) {
    const identity = await this.identityResolver.resolveSocket(client);

    if (!identity) {
      this.logger.warn(`Rejected socket connection ${client.id}: missing auth context.`);
      client.emit("chat:error", {
        code: "UNAUTHORIZED",
        message: "Missing websocket auth context.",
      });
      client.disconnect(true);
      return;
    }

    client.data.identity = identity;
    client.join(`user:${identity.sub}`);
    this.chatState.registerConnection(client.id, identity);
    client.data.heartbeatTimer = this.startPresenceHeartbeat(client.id);
    await this.refreshParticipantLeases(client.id);
    this.logger.log(`Socket ${client.id} connected as ${identity.sub}.`);

    client.emit("chat:connected", {
      socketId: client.id,
      subject: identity.sub,
      effectiveRoles: identity.effectiveRoles,
      personalRoomId: `user:${identity.sub}`,
      timestamp: new Date().toISOString(),
    });
  }

  public async handleDisconnect(client: AuthenticatedSocket) {
    const unregisterResult = this.chatState.unregisterConnection(client.id);

    if (client.data.heartbeatTimer) {
      clearInterval(client.data.heartbeatTimer);
    }

    this.logger.log(`Socket ${client.id} disconnected.`);

    for (const roomId of unregisterResult.joinedRooms) {
      await this.redis.removeRoomParticipant(roomId, client.id);
    }

    for (const event of unregisterResult.presenceEvents) {
      await this.publishPresence(event);
    }
  }

  @SubscribeMessage("chat:join-room")
  public async joinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const identity = this.getIdentityOrThrow(client);
    const room = this.chatState.parseRoom(payload.roomId);

    if (!room) {
      throw new WsException("Unsupported room format.");
    }

    this.assertRoomAccess(identity, room.id);
    client.join(payload.roomId);
    this.chatState.joinRoom(client.id, payload.roomId);
    await this.redis.touchRoomParticipant(
      payload.roomId,
      client.id,
      this.nextPresenceExpiryEpochMs(),
    );
    const participantCount = await this.redis.countRoomParticipants(
      payload.roomId,
      Date.now(),
    );
    const history = await this.messages.getRecentMessages(payload.roomId);
    const presenceEvent: ChatPresenceEvent = {
      roomId: payload.roomId,
      subject: identity.sub,
      state: "online",
      timestamp: new Date().toISOString(),
    };

    await this.publishPresence(presenceEvent);

    return {
      roomId: payload.roomId,
      socketId: client.id,
      participantCount,
      history,
    };
  }

  @SubscribeMessage("chat:send-message")
  public async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatMessagePayload,
  ) {
    const identity = this.getIdentityOrThrow(client);

    this.assertRoomAccess(identity, payload.roomId);

    const queued = await this.messages.createQueuedMessage({
      roomId: payload.roomId,
      identity,
      text: payload.text.trim(),
    });
    const delivered = await this.messages.markDelivered(queued.id);

    await this.publishMessage(delivered);

    return delivered;
  }

  @SubscribeMessage("chat:ack-delivered")
  public async ackDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatMessageReceiptPayload,
  ) {
    const identity = this.getIdentityOrThrow(client);
    const message = await this.getAccessibleMessageOrThrow(identity, payload.messageId);
    const updated = await this.messages.ackDelivered(message.id, identity.sub);

    await this.publishMessageUpdated(updated);

    return updated;
  }

  @SubscribeMessage("chat:ack-read")
  public async ackRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatMessageReceiptPayload,
  ) {
    const identity = this.getIdentityOrThrow(client);
    const message = await this.getAccessibleMessageOrThrow(identity, payload.messageId);
    const updated = await this.messages.ackRead(message.id, identity.sub);

    await this.publishMessageUpdated(updated);

    return updated;
  }

  private async publishMessage(message: {
    roomId: string;
    authorSubject: string;
    authorName?: string;
    id: string;
    text: string;
    createdAt: string;
    deliveryStatus: "queued" | "delivered";
    receipts: Array<{
      subject: string;
      deliveredAt?: string;
      readAt?: string;
    }>;
  }) {
    try {
      await this.realtime.publishMessage(message);
    } catch {
      this.server.to(message.roomId).emit("chat:message", message);
    }
  }

  private async publishMessageUpdated(message: {
    roomId: string;
    authorSubject: string;
    authorName?: string;
    id: string;
    text: string;
    createdAt: string;
    deliveryStatus: "queued" | "delivered";
    receipts: Array<{
      subject: string;
      deliveredAt?: string;
      readAt?: string;
    }>;
  }) {
    try {
      await this.realtime.publishMessageUpdated(message);
    } catch {
      this.server.to(message.roomId).emit("chat:message-updated", message);
    }
  }

  private async publishPresence(event: ChatPresenceEvent) {
    try {
      await this.realtime.publishPresence(event);
    } catch {
      this.server.to(event.roomId).emit("chat:presence", event);
    }
  }

  private startPresenceHeartbeat(socketId: string) {
    const timer = setInterval(() => {
      void this.refreshParticipantLeases(socketId);
    }, this.presenceHeartbeatMs);

    timer.unref?.();

    return timer;
  }

  private async refreshParticipantLeases(socketId: string) {
    const joinedRooms = this.chatState.getJoinedRooms(socketId);

    if (joinedRooms.length === 0) {
      return;
    }

    const expiresAt = this.nextPresenceExpiryEpochMs();

    await Promise.all(
      joinedRooms.map((roomId) =>
        this.redis.touchRoomParticipant(roomId, socketId, expiresAt),
      ),
    );
  }

  private nextPresenceExpiryEpochMs(): number {
    return Date.now() + this.presenceTtlMs;
  }

  private async getAccessibleMessageOrThrow(
    identity: RequestIdentity,
    messageId: string,
  ) {
    const message = await this.messages.getMessageById(messageId);

    if (!message) {
      throw new WsException("Message not found.");
    }

    this.assertRoomAccess(identity, message.roomId);

    return message;
  }

  private getIdentityOrThrow(client: AuthenticatedSocket): RequestIdentity {
    const identity = client.data.identity;

    if (!identity) {
      throw new WsException("Unauthenticated websocket connection.");
    }

    return identity;
  }

  private assertRoomAccess(identity: RequestIdentity, roomId: string) {
    const room = this.chatState.parseRoom(roomId);

    if (!room) {
      throw new WsException("Unsupported room format.");
    }

    if (identity.effectiveRoles.includes("platform_admin")) {
      return;
    }

    if (room.scope === "organization") {
      const allowed = identity.tenantMemberships.some(
        (membership) => membership.organizationId === room.organizationId,
      );

      if (!allowed) {
        throw new WsException("The current identity cannot access this room.");
      }

      return;
    }

    if (room.scope === "direct" && room.subject === identity.sub) {
      return;
    }

    throw new WsException("The current identity cannot access this room.");
  }
}
