import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";
import type { ChatMessageRecord, RequestIdentity } from "@galiaf/types";
import { ChatDatabaseService } from "../platform/chat-database.service.js";

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function expectSingleRow<T extends QueryResultRow>(
  result: QueryResult<T>,
  context: string,
): T {
  const row = result.rows[0];

  if (!row) {
    throw new InternalServerErrorException(
      `Expected a row from ${context}, but query returned nothing.`,
    );
  }

  return row;
}

function mapMessageRow(row: {
  id: string;
  room_id: string;
  author_subject: string;
  author_name: string | null;
  text: string;
  created_at: string;
  delivery_status: ChatMessageRecord["deliveryStatus"];
}): ChatMessageRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    authorSubject: row.author_subject,
    authorName: row.author_name ?? undefined,
    text: row.text,
    createdAt: row.created_at,
    deliveryStatus: row.delivery_status,
  };
}

@Injectable()
export class ChatMessageStoreService {
  public constructor(
    @Inject(ChatDatabaseService)
    private readonly database: ChatDatabaseService,
  ) {}

  public async createQueuedMessage(input: {
    roomId: string;
    identity: RequestIdentity;
    text: string;
  }): Promise<ChatMessageRecord> {
    const result = await this.database.query<{
      id: string;
      room_id: string;
      author_subject: string;
      author_name: string | null;
      text: string;
      created_at: string;
      delivery_status: ChatMessageRecord["deliveryStatus"];
    }>(
      `insert into chat_messages (
         id,
         room_id,
         author_subject,
         author_name,
         text,
         delivery_status
       )
       values ($1, $2, $3, $4, $5, 'queued')
       returning id, room_id, author_subject, author_name, text, created_at, delivery_status`,
      [
        createId("msg"),
        input.roomId,
        input.identity.sub,
        input.identity.name ?? null,
        input.text,
      ],
    );

    return mapMessageRow(expectSingleRow(result, "createQueuedMessage"));
  }

  public async markDelivered(messageId: string): Promise<ChatMessageRecord> {
    const result = await this.database.query<{
      id: string;
      room_id: string;
      author_subject: string;
      author_name: string | null;
      text: string;
      created_at: string;
      delivery_status: ChatMessageRecord["deliveryStatus"];
    }>(
      `update chat_messages
       set delivery_status = 'delivered'
       where id = $1
       returning id, room_id, author_subject, author_name, text, created_at, delivery_status`,
      [messageId],
    );

    return mapMessageRow(expectSingleRow(result, "markDelivered"));
  }

  public async getRecentMessages(roomId: string, limit = 30): Promise<ChatMessageRecord[]> {
    const result = await this.database.query<{
      id: string;
      room_id: string;
      author_subject: string;
      author_name: string | null;
      text: string;
      created_at: string;
      delivery_status: ChatMessageRecord["deliveryStatus"];
    }>(
      `select id, room_id, author_subject, author_name, text, created_at, delivery_status
       from chat_messages
       where room_id = $1
       order by created_at desc
       limit $2`,
      [roomId, limit],
    );

    return result.rows.map(mapMessageRow).reverse();
  }

  public async getStats(): Promise<{ messages: number; rooms: number }> {
    const result = await this.database.query<{
      messages: string;
      rooms: string;
    }>(
      `select
         count(*)::text as messages,
         count(distinct room_id)::text as rooms
       from chat_messages`,
    );

    const row = expectSingleRow(result, "getStats");

    return {
      messages: Number(row.messages),
      rooms: Number(row.rooms),
    };
  }
}
