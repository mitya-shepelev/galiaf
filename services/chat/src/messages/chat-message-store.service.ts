import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import type { QueryResult, QueryResultRow } from "pg";
import type {
  ChatMessageReceipt,
  ChatMessageRecord,
  RequestIdentity,
} from "@galiaf/types";
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

type ChatMessageRow = {
  id: string;
  room_id: string;
  author_subject: string;
  author_name: string | null;
  text: string;
  created_at: string;
  delivery_status: ChatMessageRecord["deliveryStatus"];
  receipts: ChatMessageReceipt[] | null;
};

function mapMessageRow(row: ChatMessageRow): ChatMessageRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    authorSubject: row.author_subject,
    authorName: row.author_name ?? undefined,
    text: row.text,
    createdAt: row.created_at,
    deliveryStatus: row.delivery_status,
    receipts: row.receipts ?? [],
  };
}

const messageSelectSql = `
  select
    m.id,
    m.room_id,
    m.author_subject,
    m.author_name,
    m.text,
    m.created_at,
    m.delivery_status,
    coalesce(
      json_agg(
        json_build_object(
          'subject', r.subject,
          'deliveredAt', r.delivered_at,
          'readAt', r.read_at
        )
        order by r.subject asc
      ) filter (where r.subject is not null),
      '[]'::json
    ) as receipts
  from chat_messages m
  left join chat_message_receipts r on r.message_id = m.id
`;

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
    const row = expectSingleRow(result, "createQueuedMessage");

    return mapMessageRow({
      ...row,
      receipts: [],
    });
  }

  public async markDelivered(messageId: string): Promise<ChatMessageRecord> {
    await this.database.query(
      `update chat_messages
       set delivery_status = 'delivered'
       where id = $1`,
      [messageId],
    );

    const current = await this.getMessageById(messageId);

    if (!current) {
      throw new InternalServerErrorException(
        `Expected to reload message ${messageId} after markDelivered.`,
      );
    }

    return current;
  }

  public async getMessageById(messageId: string): Promise<ChatMessageRecord | undefined> {
    const result = await this.database.query<ChatMessageRow>(
      `${messageSelectSql}
       where m.id = $1
       group by m.id`,
      [messageId],
    );
    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return mapMessageRow(row);
  }

  public async getRecentMessages(roomId: string, limit = 30): Promise<ChatMessageRecord[]> {
    const result = await this.database.query<ChatMessageRow>(
      `${messageSelectSql}
       where m.room_id = $1
       group by m.id
       order by m.created_at desc
       limit $2`,
      [roomId, limit],
    );

    return result.rows.map(mapMessageRow).reverse();
  }

  public async ackDelivered(
    messageId: string,
    subject: string,
  ): Promise<ChatMessageRecord> {
    await this.database.query(
      `insert into chat_message_receipts (message_id, subject, delivered_at)
       values ($1, $2, now())
       on conflict (message_id, subject) do update
       set delivered_at = coalesce(chat_message_receipts.delivered_at, excluded.delivered_at)`,
      [messageId, subject],
    );

    const updated = await this.getMessageById(messageId);

    if (!updated) {
      throw new InternalServerErrorException(
        `Expected to reload message ${messageId} after ackDelivered.`,
      );
    }

    return updated;
  }

  public async ackRead(messageId: string, subject: string): Promise<ChatMessageRecord> {
    await this.database.query(
      `insert into chat_message_receipts (message_id, subject, delivered_at, read_at)
       values ($1, $2, now(), now())
       on conflict (message_id, subject) do update
       set delivered_at = coalesce(chat_message_receipts.delivered_at, excluded.delivered_at),
           read_at = coalesce(chat_message_receipts.read_at, excluded.read_at)`,
      [messageId, subject],
    );

    const updated = await this.getMessageById(messageId);

    if (!updated) {
      throw new InternalServerErrorException(
        `Expected to reload message ${messageId} after ackRead.`,
      );
    }

    return updated;
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
