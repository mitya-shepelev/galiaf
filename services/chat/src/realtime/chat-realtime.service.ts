import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { RedisClientType } from "redis";
import type { ChatMessageRecord, ChatPresenceEvent } from "@galiaf/types";
import { ChatRedisService } from "../platform/chat-redis.service.js";

type ChatRealtimeEnvelope =
  | {
      kind: "message";
      roomId: string;
      payload: ChatMessageRecord;
    }
  | {
      kind: "presence";
      roomId: string;
      payload: ChatPresenceEvent;
    };

type ChatRealtimeConsumer = (event: ChatRealtimeEnvelope) => void;

const CHAT_EVENTS_CHANNEL = "galiaf:chat:events";

@Injectable()
export class ChatRealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private readonly consumers = new Set<ChatRealtimeConsumer>();
  private subscriber!: RedisClientType;

  public constructor(
    @Inject(ChatRedisService)
    private readonly redis: ChatRedisService,
  ) {}

  public async onModuleInit(): Promise<void> {
    this.subscriber = this.redis.duplicate();
    this.subscriber.on("error", (error) =>
      this.logger.error(`Realtime subscriber error: ${error.message}`),
    );

    await this.subscriber.connect();
    await this.subscriber.subscribe(CHAT_EVENTS_CHANNEL, (raw) => {
      const event = this.parseEnvelope(raw);

      if (!event) {
        return;
      }

      this.dispatch(event);
    });
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.subscriber?.isOpen) {
      await this.subscriber.quit();
    }
  }

  public registerConsumer(consumer: ChatRealtimeConsumer): () => void {
    this.consumers.add(consumer);

    return () => {
      this.consumers.delete(consumer);
    };
  }

  public async publishMessage(message: ChatMessageRecord): Promise<void> {
    await this.redis.publish(
      CHAT_EVENTS_CHANNEL,
      JSON.stringify({
        kind: "message",
        roomId: message.roomId,
        payload: message,
      } satisfies ChatRealtimeEnvelope),
    );
  }

  public async publishPresence(event: ChatPresenceEvent): Promise<void> {
    await this.redis.publish(
      CHAT_EVENTS_CHANNEL,
      JSON.stringify({
        kind: "presence",
        roomId: event.roomId,
        payload: event,
      } satisfies ChatRealtimeEnvelope),
    );
  }

  public dispatch(event: ChatRealtimeEnvelope) {
    for (const consumer of this.consumers) {
      consumer(event);
    }
  }

  private parseEnvelope(raw: string): ChatRealtimeEnvelope | null {
    try {
      const parsed = JSON.parse(raw) as Partial<ChatRealtimeEnvelope>;

      if (
        (parsed.kind === "message" || parsed.kind === "presence") &&
        typeof parsed.roomId === "string" &&
        parsed.payload
      ) {
        return parsed as ChatRealtimeEnvelope;
      }
    } catch (error) {
      this.logger.warn(
        `Ignoring malformed realtime event: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }

    return null;
  }
}
