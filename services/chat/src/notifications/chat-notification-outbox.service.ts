import { Inject, Injectable } from "@nestjs/common";
import type { ChatNotificationEventType } from "@galiaf/types";
import { ChatDatabaseService } from "../platform/chat-database.service.js";

export type ChatNotificationOutboxStatus =
  | "pending"
  | "dispatching"
  | "dispatched"
  | "failed";

export interface ChatNotificationOutboxRecord {
  id: string;
  eventType: ChatNotificationEventType;
  roomId: string;
  messageId: string;
  actorSubject: string;
  payload: Record<string, unknown>;
  status: ChatNotificationOutboxStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

type ChatNotificationOutboxRow = {
  id: string;
  event_type: ChatNotificationEventType;
  room_id: string;
  message_id: string;
  actor_subject: string;
  payload: Record<string, unknown> | null;
  status: ChatNotificationOutboxStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  dispatched_at: string | null;
};

function mapRow(row: ChatNotificationOutboxRow): ChatNotificationOutboxRecord {
  return {
    id: row.id,
    eventType: row.event_type,
    roomId: row.room_id,
    messageId: row.message_id,
    actorSubject: row.actor_subject,
    payload: row.payload ?? {},
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dispatchedAt: row.dispatched_at ?? undefined,
  };
}

@Injectable()
export class ChatNotificationOutboxService {
  public constructor(
    @Inject(ChatDatabaseService)
    private readonly database: ChatDatabaseService,
  ) {}

  public async enqueue(input: {
    eventType: ChatNotificationEventType;
    roomId: string;
    messageId: string;
    actorSubject: string;
    payload?: Record<string, unknown>;
  }): Promise<ChatNotificationOutboxRecord> {
    const inserted = await this.database.query<ChatNotificationOutboxRow>(
      `insert into chat_notification_outbox (
         id,
         event_type,
         room_id,
         message_id,
         actor_subject,
         payload
       )
       values ($1, $2, $3, $4, $5, $6::jsonb)
       on conflict (event_type, message_id, actor_subject) do nothing
       returning id, event_type, room_id, message_id, actor_subject, payload, status,
                 attempts, last_error, created_at, updated_at, dispatched_at`,
      [
        createId("notif"),
        input.eventType,
        input.roomId,
        input.messageId,
        input.actorSubject,
        JSON.stringify(input.payload ?? {}),
      ],
    );

    const insertedRow = inserted.rows[0];

    if (insertedRow) {
      return mapRow(insertedRow);
    }

    const existing = await this.database.query<ChatNotificationOutboxRow>(
      `select id, event_type, room_id, message_id, actor_subject, payload, status,
              attempts, last_error, created_at, updated_at, dispatched_at
       from chat_notification_outbox
       where event_type = $1
         and message_id = $2
         and actor_subject = $3
       limit 1`,
      [input.eventType, input.messageId, input.actorSubject],
    );
    const existingRow = existing.rows[0];

    if (!existingRow) {
      throw new Error("Failed to enqueue notification outbox record.");
    }

    return mapRow(existingRow);
  }

  public async claimPending(limit = 100): Promise<ChatNotificationOutboxRecord[]> {
    const result = await this.database.query<ChatNotificationOutboxRow>(
      `with next_records as (
         select id
         from chat_notification_outbox
         where status = 'pending'
         order by created_at asc
         limit $1
         for update skip locked
       )
       update chat_notification_outbox as outbox
       set status = 'dispatching',
           updated_at = now()
       from next_records
       where outbox.id = next_records.id
       returning outbox.id, outbox.event_type, outbox.room_id, outbox.message_id,
                 outbox.actor_subject, outbox.payload, outbox.status, outbox.attempts,
                 outbox.last_error, outbox.created_at, outbox.updated_at, outbox.dispatched_at`,
      [limit],
    );

    return result.rows.map(mapRow);
  }

  public async requeueStaleDispatching(staleAfterSeconds = 90): Promise<number> {
    const result = await this.database.query<{ id: string }>(
      `update chat_notification_outbox
       set status = 'pending',
           last_error = coalesce(last_error, 'dispatch lease expired'),
           updated_at = now()
       where status = 'dispatching'
         and updated_at < now() - make_interval(secs => $1)
       returning id`,
      [staleAfterSeconds],
    );

    return result.rowCount ?? 0;
  }

  public async markDispatched(id: string): Promise<void> {
    await this.database.query(
      `update chat_notification_outbox
       set status = 'dispatched',
           dispatched_at = now(),
           updated_at = now()
       where id = $1`,
      [id],
    );
  }

  public async markFailed(
    id: string,
    errorMessage: string,
    maxAttempts: number,
  ): Promise<void> {
    await this.database.query(
      `update chat_notification_outbox
       set status = case
             when attempts + 1 >= $3 then 'failed'
             else 'pending'
           end,
           attempts = attempts + 1,
           last_error = $2,
           updated_at = now()
       where id = $1`,
      [id, errorMessage.slice(0, 1000), maxAttempts],
    );
  }

  public async getStats(): Promise<{
    pending: number;
    dispatching: number;
    dispatched: number;
    failed: number;
  }> {
    const result = await this.database.query<{
      pending: string;
      dispatching: string;
      dispatched: string;
      failed: string;
    }>(
      `select
         count(*) filter (where status = 'pending')::text as pending,
         count(*) filter (where status = 'dispatching')::text as dispatching,
         count(*) filter (where status = 'dispatched')::text as dispatched,
         count(*) filter (where status = 'failed')::text as failed
       from chat_notification_outbox`,
    );
    const row = result.rows[0] ?? {
      pending: "0",
      dispatching: "0",
      dispatched: "0",
      failed: "0",
    };

    return {
      pending: Number(row.pending),
      dispatching: Number(row.dispatching),
      dispatched: Number(row.dispatched),
      failed: Number(row.failed),
    };
  }
}
